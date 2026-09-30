// Runs the client-side sync tests (games/tier-one/v3/web/src/lib/__tests__/*.test.ts) under node --test:
// bundles each test with the web app's esbuild into a scratch dir, then runs node's test runner on the output.
//   node api/tier-one/v4/_test/client.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const WEB = path.join(ROOT, 'games/tier-one/v3/web');
const TESTS = path.join(WEB, 'src/lib/__tests__');
const esbuild = path.join(WEB, 'node_modules/.bin/esbuild');
if (!fs.existsSync(esbuild)) { console.error('run `npm install` in games/tier-one/v3/web first'); process.exit(2); }
const out = fs.mkdtempSync(path.join(process.env.CLAUDE_SCRATCH_DIR || os.tmpdir(), 't1-client-tests-'));
const files = fs.readdirSync(TESTS).filter((f) => f.endsWith('.test.ts'));
for (const f of files) {
  const r = spawnSync(esbuild, [path.join(TESTS, f), '--bundle', '--platform=node', '--format=esm', '--target=node20', '--outfile=' + path.join(out, f.replace(/\.ts$/, '.mjs'))], { stdio: 'inherit', cwd: WEB });
  if (r.status) process.exit(r.status);
}
const t = spawnSync(process.execPath, ['--test', ...files.map((f) => path.join(out, f.replace(/\.ts$/, '.mjs')))], { stdio: 'inherit', env: { ...process.env, NODE_PATH: path.join(WEB, 'node_modules') } });
process.exit(t.status || 0);
