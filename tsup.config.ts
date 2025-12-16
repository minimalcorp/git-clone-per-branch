import { defineConfig } from 'tsup';

export default defineConfig([
  // Main library exports
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    shims: true,
  },
  // CLI binary
  {
    entry: { 'bin/cli': 'src/bin/cli.ts' },
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    shims: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
