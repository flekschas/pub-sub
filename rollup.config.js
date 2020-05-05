import buble from 'rollup-plugin-buble';
import filesize from 'rollup-plugin-filesize';
import { terser } from 'rollup-plugin-terser';

import pkg from './package.json';

const config = (file, format, plugins = []) => ({
  input: 'src/index.js',
  output: {
    name: 'createPubSub',
    exports: 'named',
    format,
    file,
    banner: `// ${pkg.name} v${
      pkg.version
    } Copyright ${new Date().getFullYear()} ${pkg.author.name}`
  },
  plugins
});

export default [
  config('dist/pub-sub-es.js', 'umd', [buble(), filesize()]),
  config('dist/pub-sub-es.min.js', 'umd', [buble(), terser()]),
  config('dist/pub-sub-es.esm.js', 'esm')
];
