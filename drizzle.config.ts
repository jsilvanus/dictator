import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Use DATABASE_URL when provided; fall back to a sensible localhost URL
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/dictator',
  },
});
