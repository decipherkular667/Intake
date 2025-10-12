import Database from 'better-sqlite3';

const db = new Database('dev-database.sqlite');

const myEmail = 'decipherkul@gmail.com';
const myUserId = '3e7a172c-7237-48b1-a17c-f10730466bf0';

console.log(`🗑️  Removing rate limits for ${myEmail}...\n`);

// Check if limit exists
const existingLimit = db.prepare('SELECT * FROM rate_limits WHERE user_id = ?').get(myUserId);

if (existingLimit) {
  console.log('Found existing rate limit:');
  console.log(`  - Total requests: ${existingLimit.total_requests}`);
  console.log(`  - Minute count: ${existingLimit.minute_count}/5`);
  console.log(`  - Hour count: ${existingLimit.hour_count}/20`);
  console.log(`  - Day count: ${existingLimit.day_count}/50`);

  db.prepare('DELETE FROM rate_limits WHERE user_id = ?').run(myUserId);
  console.log('\n✅ Rate limit removed successfully!');
} else {
  console.log('ℹ️  No rate limit found for this user.');
}

db.close();
