import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Use DATABASE_URL when provided; fall back to a constructed URL using DB_PORT and DB_PASSWORD
    url:
      process.env.DATABASE_URL ??
      `postgresql://dictator:${process.env.DB_PASSWORD ?? 'changeme'}@localhost:${process.env.DB_PORT ?? '5432'}/dictator`,
  },
});
