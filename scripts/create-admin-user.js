import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createAdminUser() {
  try {
    console.log('🔄 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    const email = process.env.ADMIN_EMAIL || 'decipherkul@gmail.com';
    const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!'; // Change this!
    const firstName = 'Admin';
    const lastName = 'User';

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️  User already exists:', email);
      console.log('User ID:', existingUser.rows[0].id);
      process.exit(0);
    }

    // Hash password
    console.log('🔄 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    console.log('🔄 Creating admin user...');
    const result = await client.query(
      `INSERT INTO users (email, password, first_name, last_name, email_verified, is_active)
       VALUES ($1, $2, $3, $4, true, true)
       RETURNING id, email, first_name, last_name`,
      [email, hashedPassword, firstName, lastName]
    );

    console.log('✅ Admin user created successfully!');
    console.log('User details:', result.rows[0]);
    console.log('📝 Note: This user has no rate limits by default (not enforced for your email)');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await client.end();
    process.exit(0);
  }
}

createAdminUser();
