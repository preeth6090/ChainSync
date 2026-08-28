// Integration tests hit the real database (there's no local Postgres in this project — Neon
// is the only instance, dev and prod share it). They're opt-in: each file uses
// `describe.skipIf(!hasDatabase)` to skip cleanly wherever DATABASE_URL isn't set (a fresh
// clone, CI without secrets) instead of failing the run.
export const hasDatabase = !!process.env.DATABASE_URL;
