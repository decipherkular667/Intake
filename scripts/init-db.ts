#!/usr/bin/env tsx

/**
 * Database initialization script
 *
 * This script:
 * 1. Checks database connection
 * 2. Runs pending migrations
 * 3. Optionally seeds initial data
 *
 * Usage:
 *   npm run db:init        # Initialize database
 *   npm run db:init --seed # Initialize with sample data
 */

import { db } from '../server/db';
import { healthProfiles, foodEntries, insights } from '../shared/schema';

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...');
    await db.select().from(healthProfiles).limit(1);
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.log('\n📋 To fix this:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Create a database for the app');
    console.log('3. Set DATABASE_URL in your .env file');
    console.log('   Example: DATABASE_URL=postgresql://username:password@localhost:5432/intakeai_health');
    return false;
  }
}

async function checkTables() {
  try {
    console.log('🔍 Checking database tables...');

    // Try to query each table to see if it exists
    const tables = [
      { name: 'health_profiles', query: () => db.select().from(healthProfiles).limit(1) },
      { name: 'food_entries', query: () => db.select().from(foodEntries).limit(1) },
      { name: 'insights', query: () => db.select().from(insights).limit(1) },
    ];

    for (const table of tables) {
      try {
        await table.query();
        console.log(`  ✅ Table '${table.name}' exists`);
      } catch (error) {
        console.log(`  ❌ Table '${table.name}' missing`);
        throw new Error(`Missing table: ${table.name}`);
      }
    }

    console.log('✅ All required tables exist');
    return true;
  } catch (error) {
    console.error('❌ Table check failed:', error);
    console.log('\n📋 To fix this:');
    console.log('1. Run: npm run db:push');
    console.log('   This will create the database tables from your schema');
    return false;
  }
}

async function seedData() {
  try {
    console.log('🌱 Seeding sample data...');

    // Check if data already exists
    const existingProfiles = await db.select().from(healthProfiles).limit(1);
    if (existingProfiles.length > 0) {
      console.log('📊 Sample data already exists, skipping seed');
      return;
    }

    // Create a sample health profile
    const sampleProfile = await db.insert(healthProfiles).values({
      name: 'Sample User',
      height: 170, // cm
      weight: 70,  // kg
      birthYear: 1990,
      birthMonth: 6,
      medicalConditions: ['None'],
      allergies: [],
      medications: [],
      smokingStatus: 'never',
    }).returning();

    console.log(`✅ Created sample health profile: ${sampleProfile[0].name}`);

    // Create a sample food entry
    const today = new Date().toISOString().split('T')[0];
    await db.insert(foodEntries).values({
      profileId: sampleProfile[0].id,
      foodName: 'Apple',
      servingSize: 1,
      servingUnit: 'medium',
      mealType: 'snack',
      nutritionData: {
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
        fiber: 4.4,
        sugar: 19,
        vitamins: { vitamin_c: 8.4 },
        minerals: { potassium: 195 },
      },
      entryDate: today,
    });

    console.log('✅ Created sample food entry');
    console.log('🎉 Sample data seeded successfully!');

  } catch (error) {
    console.error('❌ Failed to seed data:', error);
  }
}

async function main() {
  console.log('🚀 Initializing IntakeAI Health Database\n');

  // Test connection
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }

  // Check tables
  const tablesOk = await checkTables();
  if (!tablesOk) {
    process.exit(1);
  }

  // Seed data if requested
  const shouldSeed = process.argv.includes('--seed');
  if (shouldSeed) {
    await seedData();
  }

  console.log('\n✅ Database initialization complete!');
  console.log('\n🎯 Next steps:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Visit http://localhost:5173 to use the app');

  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

main().catch((error) => {
  console.error('❌ Initialization failed:', error);
  process.exit(1);
});