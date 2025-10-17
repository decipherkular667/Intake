import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function migrateAndStart() {
  try {
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
