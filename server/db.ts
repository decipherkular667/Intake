import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../shared/schema-sqlite';

// Use SQLite for development
const sqlite = new Database('dev-database.sqlite');
export const db = drizzle(sqlite, { schema });

// Export schema for convenience
export * from '../shared/schema-sqlite';

// Create tables and enable foreign keys
try {
  sqlite.exec('PRAGMA foreign_keys = ON;');
  console.log('🔌 SQLite development database connected');
} catch (error) {
  console.error('❌ Database initialization failed:', error);
}