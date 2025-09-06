import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  dts: true,
  format: ['esm', 'cjs'],
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  outDir: 'dist',
  target: 'es2020',
});
