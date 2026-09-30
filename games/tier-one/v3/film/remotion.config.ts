// The film project renders the game's own scene files (../web/src/film/scenes). They import the game's
// remotion-shim; here that module is swapped for the real `remotion` package, and React/Remotion always resolve
// to this project's copies (one React, one Remotion), wherever the importing file lives.
import path from 'node:path';
import { Config } from '@remotion/cli/config';

const here = process.cwd();
const mod = (m: string) => path.join(here, 'node_modules', m);
const shim = path.join(here, '../web/src/film/remotion-shim');

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.overrideWebpackConfig((c) => ({
  ...c,
  resolve: {
    ...c.resolve,
    alias: { ...(c.resolve?.alias as object), [shim + '.ts']: mod('remotion'), [shim]: mod('remotion'), remotion: mod('remotion'), react: mod('react'), 'react-dom': mod('react-dom') },
    modules: [...(c.resolve?.modules || ['node_modules']), mod('')],
  },
}));
