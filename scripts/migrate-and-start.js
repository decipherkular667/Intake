import { exec } from 'child_process';
import { promisify } from 'util';
import pkg from 'pg';
const { Client } = pkg;

const execAsync = promisify(exec);

async function migrateAndStart() {
  try {
    // First, drop the old rate_limits table to avoid migration conflicts
    console.log('🔄 Checking for old rate_limits table...');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      await client.query('DROP TABLE IF EXISTS rate_limits CASCADE');
      console.log('✅ Old rate_limits table dropped');
      await client.end();
    } catch (dropError) {
      console.log('⚠️  Could not drop rate_limits table:', dropError.message);
      try { await client.end(); } catch (e) { /* ignore */ }
    }

    console.log('🔄 Running database migration...');

    // Run migration
    try {
      const { stdout, stderr } = await execAsync('npx drizzle-kit push --config=drizzle.config.prod.ts --force');
      console.log(stdout);
      if (stderr && !stderr.includes('warning')) {
        console.error('Migration stderr:', stderr);
      }
      console.log('✅ Migration completed successfully');
    } catch (migrationError) {
      console.error('⚠️  Migration failed, but continuing with server start...');
      console.error(migrationError.message);
    }

    console.log('🚀 Starting server...');

    // Start the server
    const serverProcess = exec('node dist/index.js');

    serverProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    serverProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    serverProcess.on('exit', (code) => {
      process.exit(code);
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

migrateAndStart();
