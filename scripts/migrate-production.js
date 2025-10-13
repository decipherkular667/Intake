import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function migrate() {
  try {
    console.log('🔄 Running database migration...');

    // Run drizzle-kit push with --force flag to skip confirmation
    const { stdout, stderr } = await execAsync('npx drizzle-kit push --config=drizzle.config.prod.ts --force');

    console.log(stdout);
    if (stderr) console.error(stderr);

    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
