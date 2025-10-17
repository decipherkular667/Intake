import { exec } from 'child_process';

async function migrateAndStart() {
  try {
    // No migration needed - tables are already created by db:setup:prod
    console.log('✅ Tables already created by setup script');

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
