#!/usr/bin/env tsx

/**
 * Environment Setup Script
 *
 * This script helps developers set up their environment configuration
 * by copying the appropriate template and generating secure secrets.
 */

import { promises as fs } from 'fs';
import { generateSecret } from '../server/secrets';
import { execSync } from 'child_process';

const ENVIRONMENTS = ['development', 'production', 'test'] as const;
type Environment = typeof ENVIRONMENTS[number];

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function copyEnvTemplate(env: Environment) {
  const templatePath = `.env.${env}`;
  const targetPath = '.env';

  // Check if template exists
  if (!(await fileExists(templatePath))) {
    console.error(`❌ Template ${templatePath} not found`);
    return false;
  }

  // Check if .env already exists
  if (await fileExists(targetPath)) {
    console.log(`⚠️  .env file already exists`);
    const shouldOverwrite = process.argv.includes('--force');

    if (!shouldOverwrite) {
      console.log('Use --force to overwrite existing .env file');
      return false;
    }

    // Backup existing .env
    const backupPath = `.env.backup.${Date.now()}`;
    await fs.copyFile(targetPath, backupPath);
    console.log(`📋 Backed up existing .env to ${backupPath}`);
  }

  // Copy template
  await fs.copyFile(templatePath, targetPath);
  console.log(`✅ Copied ${templatePath} to .env`);
  return true;
}

async function generateSecrets() {
  console.log('🔐 Generating secure secrets...');

  const secrets = {
    SESSION_SECRET: generateSecret(48), // 64 characters base64url
    JWT_SECRET: generateSecret(32),     // 43 characters base64url
  };

  console.log('Generated secrets:');
  console.log(`SESSION_SECRET=${secrets.SESSION_SECRET}`);
  console.log(`JWT_SECRET=${secrets.JWT_SECRET}`);

  return secrets;
}

async function updateEnvFile(secrets: Record<string, string>) {
  const envPath = '.env';
  let content = await fs.readFile(envPath, 'utf-8');

  // Replace placeholder secrets
  for (const [key, value] of Object.entries(secrets)) {
    const patterns = [
      `${key}=your_${key.toLowerCase()}_here_change_this_in_production`,
      `${key}=dev_${key.toLowerCase()}_change_this_in_production_minimum_32_chars`,
      `${key}=dev_${key.toLowerCase()}_change_this_in_production`,
      `${key}=generate_strong_64_character_secret_using_openssl_rand_base64_48`,
      `${key}=generate_strong_32_character_secret_using_openssl_rand_base64_24`,
    ];

    for (const pattern of patterns) {
      content = content.replace(pattern, `${key}=${value}`);
    }
  }

  await fs.writeFile(envPath, content);
  console.log('✅ Updated .env with generated secrets');
}

async function validateSetup() {
  console.log('🔍 Validating environment setup...');

  try {
    // Import and validate environment (this will run validation)
    await import('../server/env-config');
    console.log('✅ Environment validation passed');
    return true;
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    return false;
  }
}

async function showNextSteps(env: Environment) {
  console.log('\n🎯 Next Steps:');
  console.log('1. Review the .env file and update any placeholder values');

  if (env === 'development') {
    console.log('2. Set up your local PostgreSQL database:');
    console.log('   createdb intakeai_health_dev');
    console.log('3. Update DATABASE_URL in .env with your database credentials');
    console.log('4. Run: npm run db:push');
    console.log('5. Run: npm run dev');
  } else if (env === 'production') {
    console.log('2. Set up your production database');
    console.log('3. Configure all API keys and external services');
    console.log('4. Set up SSL certificates');
    console.log('5. Configure monitoring and logging');
    console.log('6. Run: npm run build && npm start');
  }

  console.log('\n📚 For more information, see:');
  console.log('- ENVIRONMENT.md for detailed setup instructions');
  console.log('- DATABASE.md for database setup');
}

async function main() {
  console.log('🚀 IntakeAI Health - Environment Setup\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const envArg = args.find(arg => ENVIRONMENTS.includes(arg as Environment));
  const environment: Environment = (envArg as Environment) || 'development';

  console.log(`Setting up ${environment} environment...\n`);

  // Step 1: Copy environment template
  const copied = await copyEnvTemplate(environment);
  if (!copied) {
    process.exit(1);
  }

  // Step 2: Generate secure secrets
  const secrets = await generateSecrets();

  // Step 3: Update .env file with secrets
  await updateEnvFile(secrets);

  // Step 4: Validate setup
  const valid = await validateSetup();
  if (!valid) {
    console.log('\n⚠️  Environment setup completed but validation failed.');
    console.log('Please review the .env file and fix any issues.');
  }

  // Step 5: Show next steps
  await showNextSteps(environment);

  console.log('\n✅ Environment setup complete!');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
}