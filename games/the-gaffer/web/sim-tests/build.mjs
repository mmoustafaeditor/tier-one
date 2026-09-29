// Bundles a sim-test with the app's esbuild and runs it: node sim-tests/build.mjs <name> [args...]
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const [name, ...args] = process.argv.slice(2);
const out = join(here, '.out', `${name}.mjs`);
execFileSync(join(here, '..', 'node_modules', '.bin', 'esbuild'), [join(here, `${name}.ts`), '--bundle', '--platform=node', '--format=esm', `--outfile=${out}`, '--log-level=warning'], { stdio: 'inherit' });
execFileSync('node', [out, ...args], { stdio: 'inherit' });
