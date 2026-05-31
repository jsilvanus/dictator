export async function register() {
  // Lazily import env so validation errors (e.g. ZodError with a getter-only
  // `message`) can be caught and rethrown as a normal Error with a writable
  // `message` property. This prevents Next.js internals from trying to set
  // `err.message` on a getter-only property and throwing a TypeError.
  try {
    // import for side-effects / validation
    await import('@/lib/env');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Instrumentation init failed: ${message}`);
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runMigrations } = await import('@/lib/db/migrate');
    await runMigrations();
  }
}
