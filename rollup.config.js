import buble from '@rollup/plugin-buble';
import terser from '@rollup/plugin-terser';
import filesize from 'rollup-plugin-filesize';

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
  config('dist/pub-sub.js', 'es', [filesize()]),
  config('dist/pub-sub.min.js', 'es', [terser()]),
  config('dist/pub-sub.umd.js', 'umd', [buble(), filesize()]),
  config('dist/pub-sub.umd.min.js', 'umd', [buble(), terser()]),
];
