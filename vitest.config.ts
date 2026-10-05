import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    alias: {
      '@': path.resolve(__dirname, './'),
    },
    env: {
      JWT_SECRET: 'r2VdFyi0Ow4gHzp+kJDU3vRcI/Q7q/PA2v3mofgXocg=',
      CRON_SECRET: '9a14146f08f8d44d333bcad0a816ab732ab708ffeadf9b535f57efa174aaf613',
    },
  },
});
