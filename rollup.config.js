import { terser } from 'rollup-plugin-terser';
import buble from 'rollup-plugin-buble';

const config = (file, format, plugins) => ({
  input: 'src/index.js',
  output: {
    name: 'createPubSub',
    exports: 'named',
    format,
    file,
  },
  plugins,
});

export default [
  config('dist/pub-sub-es.js', 'umd', [buble()]),
  config('dist/pub-sub-es.min.js', 'umd', [buble(), terser()]),
];
