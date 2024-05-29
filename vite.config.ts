import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

export default defineConfig({
  root: '.',
  build: {
    outDir: './docs'
  },
  plugins: [
    createHtmlPlugin({
      entry: './index.js',
      template: './example/index.html',
      minify: true,
    }),
  ],
});
