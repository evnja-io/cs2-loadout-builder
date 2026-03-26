import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '../db/schema.js';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface TestDb {
  db: ReturnType<typeof drizzle<typeof schema>>;
  container: StartedPostgreSqlContainer;
  cleanup: () => Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const client = postgres(container.getConnectionUri());
  const db = drizzle(client, { schema });

  await migrate(db, {
    migrationsFolder: join(__dirname, '../../drizzle'),
  });

  return {
    db,
    container,
    cleanup: async () => {
      await client.end();
      await container.stop();
    },
  };
}
