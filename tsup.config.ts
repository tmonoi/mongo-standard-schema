import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: true,
  target: 'node22',
  external: ['mongodb', 'zod'],
  outDir: 'dist',
  treeshake: true,
  bundle: true,
  skipNodeModulesBundle: true,
  platform: 'node',
  esbuildOptions(options) {
    options.conditions = ['node'];
  },
});
