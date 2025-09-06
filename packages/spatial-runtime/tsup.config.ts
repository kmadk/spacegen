import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
  external: [
    'deck.gl', 
    '@deck.gl/core',
    '@deck.gl/layers',
    'd3-zoom', 
    'd3-selection'
  ]
});