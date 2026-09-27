/**
 * The whole app runs with zero setup: no login, no required database. A
 * handful of secondary features (saved history, company management,
 * interview reports, benchmark suggestions) persist to Postgres and simply
 * turn themselves off — with a clear message, never a crash — when no
 * DATABASE_URL is configured. This is the single source of truth for that
 * check, so every route/page tests it the same way.
 */
export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}
