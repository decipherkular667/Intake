import Database from 'better-sqlite3';

const db = new Database('dev-database.sqlite');

// Check if users table exists
const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
console.log('Users table exists:', !!tableInfo);

// Get table schema
console.log('\nUsers table schema:');
const schema = db.prepare("PRAGMA table_info(users)").all();
schema.forEach(col => {
  console.log(`  ${col.name} (${col.type})`);
});

const result = db.prepare('SELECT COUNT(*) as count FROM users').get();
console.log(`\nTotal users: ${result.count}`);

const users = db.prepare('SELECT id, email, first_name, last_name, created_at FROM users').all();
console.log('\nUsers:');
users.forEach(user => {
  console.log(`- ${user.first_name} ${user.last_name} (${user.email})`);
  console.log(`  ID: ${user.id}`);
});

// Check if rate_limits table exists
const rateLimitsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='rate_limits'").get();
console.log('\n\nRate limits table exists:', !!rateLimitsTable);

db.close();
