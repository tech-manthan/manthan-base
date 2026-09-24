import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', 'dom/index': 'src/dom/index.ts' },
  format: ['esm'],
  dts: true,
  clean: true,
  treeshake: true,
  target: 'es2022',
  external: ['@manthan/icons'],
});
