import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(projectRoot, 'src/qa'),
  envDir: projectRoot,
  publicDir: false,
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5181,
    strictPort: true,
    open: false,
  },
});