import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: false, // Disable tsup's DTS generation, we'll use tsc directly
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: true,
  target: 'node18',
  external: ['mongodb'],
  outDir: 'dist',
  treeshake: true,
  bundle: true,
  skipNodeModulesBundle: true,
  platform: 'node',
  esbuildOptions(options) {
    options.conditions = ['node'];
  },
});