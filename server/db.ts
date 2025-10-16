import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/node-postgres';
import Database from 'better-sqlite3';
import pkg from 'pg';
const { Pool } = pkg;
import * as schemaSqlite from '../shared/schema-sqlite';
import * as schemaPostgres from '../shared/schema-postgres';
import { env, isDevelopment } from './env-config';

// Use SQLite for development, PostgreSQL for production
let db: any;
export let isPostgres: boolean;
export let healthProfiles: any;
export let foodEntries: any;
export let insights: any;
export let users: any;
export let rateLimits: any;

if (isDevelopment || !env.DATABASE_URL || env.DATABASE_URL.includes('sqlite')) {
  // SQLite for development
  isPostgres = false;
  const sqlite = new Database('dev-database.sqlite');
  db = drizzleSqlite(sqlite, { schema: schemaSqlite });

  // Export SQLite schema
  healthProfiles = schemaSqlite.healthProfiles;
  foodEntries = schemaSqlite.foodEntries;
  insights = schemaSqlite.insights;
  users = schemaSqlite.users;
  rateLimits = schemaSqlite.rateLimits;

  try {
    sqlite.exec('PRAGMA foreign_keys = ON;');
    console.log('🔌 SQLite development database connected');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
} else {
  // PostgreSQL for production
  isPostgres = true;
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  db = drizzlePostgres(pool, { schema: schemaPostgres });

  // Export PostgreSQL schema
  healthProfiles = schemaPostgres.healthProfiles;
  foodEntries = schemaPostgres.foodEntries;
  insights = schemaPostgres.insights;
  users = schemaPostgres.users;
  rateLimits = schemaPostgres.rateLimits;

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

// Export types from PostgreSQL schema (types are compatible)
export * from '../shared/schema-postgres';