import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const dbPath = join(__dirname, '..', 'dev-database.sqlite');

async function createAdminUser() {
  try {
    console.log('🔄 Connecting to SQLite database...');
    const db = new Database(dbPath);
    console.log('✅ Connected to SQLite');

    const email = process.env.ADMIN_EMAIL || 'decipherkul@gmail.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin123!';
    const firstName = 'Admin';
    const lastName = 'User';

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

    if (existingUser) {
      console.log('⚠️  User already exists:', email);
      console.log('User ID:', existingUser.id);
      db.close();
      process.exit(0);
    }

    // Hash password
    console.log('🔄 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    console.log('🔄 Creating admin user...');
    const result = db.prepare(`
      INSERT INTO users (email, password, first_name, last_name, email_verified, is_active)
      VALUES (?, ?, ?, ?, 1, 1)
    `).run(email, hashedPassword, firstName, lastName);

    const newUser = db.prepare('SELECT id, email, first_name, last_name FROM users WHERE id = ?').get(result.lastInsertRowid);

    console.log('✅ Admin user created successfully!');
    console.log('User details:', newUser);
    console.log('📝 Email:', email);
    console.log('📝 Password:', password);
    console.log('📝 Note: This user has no rate limits by default');

    db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
