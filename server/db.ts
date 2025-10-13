import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/node-postgres';
import Database from 'better-sqlite3';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from '../shared/schema-sqlite';
import { env, isDevelopment } from './env-config';

// Use SQLite for development, PostgreSQL for production
let db: any;

if (isDevelopment || !env.DATABASE_URL || env.DATABASE_URL.includes('sqlite')) {
  // SQLite for development
  const sqlite = new Database('dev-database.sqlite');
  db = drizzleSqlite(sqlite, { schema });

  try {
    sqlite.exec('PRAGMA foreign_keys = ON;');
    console.log('🔌 SQLite development database connected');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
} else {
  // PostgreSQL for production
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  db = drizzlePostgres(pool, { schema });
  console.log('🔌 PostgreSQL production database connected');

  // Debug: Check what tables exist
  pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `).then(result => {
    console.log('📋 Tables in database:', result.rows.map(r => r.table_name));
  }).catch(err => {
    console.error('❌ Error checking tables:', err.message);
  });
}

export { db };

// Export schema for convenience
export * from '../shared/schema-sqlite';