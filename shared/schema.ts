// Re-export from the appropriate schema
// This file is used as a common entry point that picks the right schema
// based on whether we're using SQLite or PostgreSQL

// For now, we'll export both and let the db.ts handle which to use
// This avoids circular dependency issues
export * from './schema-sqlite';
export * from './schema-postgres';
