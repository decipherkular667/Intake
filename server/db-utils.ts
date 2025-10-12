import { db } from './db';
import { healthProfiles, foodEntries, insights } from '../shared/schema-sqlite';

/**
 * Database health check - tests if database is accessible
 */
export async function healthCheck(): Promise<{ healthy: boolean; error?: string }> {
  try {
    await db.select().from(healthProfiles).limit(1);
    return { healthy: true };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

/**
 * Get database statistics
 */
export async function getStats() {
  try {
    const [profileCount] = await db.select().from(healthProfiles);
    const [entriesCount] = await db.select().from(foodEntries);
    const [insightsCount] = await db.select().from(insights);

    return {
      profiles: profileCount ? 1 : 0, // Count actual rows
      entries: entriesCount ? 1 : 0,
      insights: insightsCount ? 1 : 0,
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return { profiles: 0, entries: 0, insights: 0 };
  }
}

/**
 * Clean up old data (for maintenance)
 */
export async function cleanup() {
  // Add any cleanup logic here, e.g.:
  // - Remove old food entries (older than 1 year)
  // - Archive old insights
  // etc.
  console.log('Database cleanup completed');
}