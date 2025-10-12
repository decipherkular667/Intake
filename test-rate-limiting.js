import Database from 'better-sqlite3';

const db = new Database('dev-database.sqlite');

// Check if rate_limits table has data
console.log('📊 Checking rate_limits table...\n');

const schema = db.prepare("PRAGMA table_info(rate_limits)").all();
console.log('Table schema:');
schema.forEach(col => {
  console.log(`  - ${col.name} (${col.type})`);
});

const allLimits = db.prepare('SELECT * FROM rate_limits').all();
console.log(`\n📈 Total rate limit records: ${allLimits.length}\n`);

if (allLimits.length > 0) {
  console.log('Rate limit details:');
  allLimits.forEach(limit => {
    const now = Date.now();
    const minuteRemaining = Math.max(0, 5 - limit.minute_count);
    const hourRemaining = Math.max(0, 20 - limit.hour_count);
    const dayRemaining = Math.max(0, 50 - limit.day_count);

    console.log(`\n👤 User ID: ${limit.user_id}`);
    console.log(`   📊 Total requests: ${limit.total_requests}`);
    console.log(`   ⏱️  Last request: ${limit.last_request_at ? new Date(limit.last_request_at).toISOString() : 'Never'}`);
    console.log(`   📉 Current usage:`);
    console.log(`      - Minute: ${limit.minute_count}/5 (${minuteRemaining} remaining)`);
    console.log(`      - Hour: ${limit.hour_count}/20 (${hourRemaining} remaining)`);
    console.log(`      - Day: ${limit.day_count}/50 (${dayRemaining} remaining)`);

    if (now > limit.minute_reset_at) {
      console.log('      ✅ Minute window expired (will reset on next request)');
    }
    if (now > limit.hour_reset_at) {
      console.log('      ✅ Hour window expired (will reset on next request)');
    }
    if (now > limit.day_reset_at) {
      console.log('      ✅ Day window expired (will reset on next request)');
    }
  });
} else {
  console.log('ℹ️  No rate limit records yet. Make an AI request to create one.');
}

// Get user details
console.log('\n\n👥 Users in database:');
const users = db.prepare('SELECT id, email, first_name, last_name FROM users').all();
users.forEach(user => {
  const hasLimits = allLimits.find(l => l.user_id === user.id);
  console.log(`  - ${user.email} (${user.first_name} ${user.last_name})`);
  console.log(`    ID: ${user.id}`);
  console.log(`    Has rate limit record: ${hasLimits ? '✅' : '❌'}`);
});

db.close();
