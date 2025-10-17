import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const createTablesSQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Health profiles table
CREATE TABLE IF NOT EXISTS health_profiles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  gender TEXT,
  height INTEGER NOT NULL,
  weight INTEGER NOT NULL,
  birth_year INTEGER NOT NULL,
  birth_month INTEGER NOT NULL,
  medical_conditions JSONB DEFAULT '[]'::jsonb,
  allergies JSONB DEFAULT '[]'::jsonb,
  medications JSONB DEFAULT '[]'::jsonb,
  smoking_status TEXT,
  smoking_frequency TEXT,
  activity_level TEXT,
  dietary_restrictions JSONB DEFAULT '[]'::jsonb,
  health_goals JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Food entries table
CREATE TABLE IF NOT EXISTS food_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  profile_id TEXT NOT NULL REFERENCES health_profiles(id),
  food_name TEXT NOT NULL,
  serving_size REAL NOT NULL,
  serving_unit TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  nutrition_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insights table
CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  profile_id TEXT NOT NULL REFERENCES health_profiles(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rate limits table (new schema with per-minute/hour/day tracking)
DROP TABLE IF EXISTS rate_limits CASCADE;
CREATE TABLE rate_limits (
  user_id TEXT PRIMARY KEY NOT NULL,
  minute_count INTEGER DEFAULT 0,
  minute_reset_at BIGINT NOT NULL,
  hour_count INTEGER DEFAULT 0,
  hour_reset_at BIGINT NOT NULL,
  day_count INTEGER DEFAULT 0,
  day_reset_at BIGINT NOT NULL,
  total_requests INTEGER DEFAULT 0,
  last_request_at BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session table (for connect-pg-simple)
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_health_profiles_user_id ON health_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_food_entries_profile_id ON food_entries(profile_id);
CREATE INDEX IF NOT EXISTS idx_food_entries_date ON food_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_insights_profile_id ON insights(profile_id);
`;

async function createTables() {
  try {
    console.log('🔄 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    console.log('🔄 Creating tables...');
    await client.query(createTablesSQL);
    console.log('✅ All tables created successfully!');

    // List tables to verify
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📋 Tables in database:', result.rows.map(r => r.table_name));

  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  } finally {
    await client.end();
    process.exit(0);
  }
}

createTables();
