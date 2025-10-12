import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('dev-database.sqlite');

// Read the migration SQL
const sql = fs.readFileSync('migrations/0001_nosy_falcon.sql', 'utf-8');

// Split on statement breakpoints and execute each
const statements = sql.split('-->').map(s => s.trim()).filter(s => s && !s.startsWith('statement-breakpoint'));

try {
  db.exec('PRAGMA foreign_keys = OFF;');

  for (const statement of statements) {
    if (statement) {
      console.log('Executing:', statement.substring(0, 100) + '...');
      db.exec(statement);
    }
  }

  db.exec('PRAGMA foreign_keys = ON;');
  console.log('\n✅ Migration applied successfully!');

  // Verify the table was created
  const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='rate_limits'").get();
  console.log('Rate limits table exists:', !!tableInfo);

} catch (error) {
  console.error('❌ Migration failed:', error);
} finally {
  db.close();
}
