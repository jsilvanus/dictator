import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import { env } from '@/lib/env';

let migrationPromise: Promise<void> | null = null;

export function runMigrations(): Promise<void> {
  migrationPromise ??= doMigrate();
  return migrationPromise;
}

async function doMigrate(): Promise<void> {
  const migrationClient = postgres(env.DATABASE_URL, { max: 1 });
  const migrationDb = drizzle(migrationClient);

  try {
    await migrate(migrationDb, { migrationsFolder: 'drizzle' });
  } finally {
    await migrationClient.end({ timeout: 5 });
  }
}
