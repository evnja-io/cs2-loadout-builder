import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      DATABASE_URL: 'postgres://test:test@localhost:5432/test',
      JWT_SECRET: 'test-secret-32-characters-minimum',
      STEAM_API_KEY: 'test-key',
      API_URL: 'http://localhost:3001',
      WEB_URL: 'http://localhost:5173',
    },
  },
});
