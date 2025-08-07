import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts'],
  format: ['cjs', 'esm'],
  dts: false, // Disable DTS generation in tsup
  clean: true,
  sourcemap: true,
  splitting: false,
  bundle: false,
});