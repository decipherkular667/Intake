import { eq, and } from 'drizzle-orm';
import { db, healthProfiles, foodEntries, insights } from './db';
import {
  type HealthProfile,
  type InsertHealthProfile,
  type FoodEntry,
  type InsertFoodEntry,
  type Insight,
  type InsertInsight
} from "../shared/schema-sqlite";
import { withDbErrorHandling, safeJsonParse, DatabaseError, NotFoundError, logError } from './error-utils';

export class DatabaseStorage {
  // Health Profile operations
  async getHealthProfile(id: string): Promise<HealthProfile | undefined> {
    return withDbErrorHandling(async () => {
      if (!id) {
        throw new DatabaseError('Health profile ID is required');
      }

      const result = await db.select().from(healthProfiles).where(eq(healthProfiles.id, id));
      if (!result[0]) return undefined;

      // Parse JSON strings back to arrays with safe parsing
      const profile = result[0];
      return {
        ...profile,
        medicalConditions: typeof profile.medicalConditions === 'string'
          ? safeJsonParse(profile.medicalConditions, [])
          : profile.medicalConditions || [],
        allergies: typeof profile.allergies === 'string'
          ? safeJsonParse(profile.allergies, [])
          : profile.allergies || [],
        medications: typeof profile.medications === 'string'
          ? safeJsonParse(profile.medications, [])
          : profile.medications || [],
        dietaryRestrictions: typeof profile.dietaryRestrictions === 'string'
          ? safeJsonParse(profile.dietaryRestrictions, [])
          : profile.dietaryRestrictions || [],
        healthGoals: typeof profile.healthGoals === 'string'
          ? safeJsonParse(profile.healthGoals, [])
          : profile.healthGoals || [],
      };
    }, `Failed to get health profile with ID: ${id}`);
  }

  async getHealthProfilesByUser(userId: string): Promise<HealthProfile[]> {
    const result = await db.select().from(healthProfiles).where(eq(healthProfiles.userId, userId));
    return result.map(profile => ({
      ...profile,
      medicalConditions: this.parseJsonField(profile.medicalConditions),
      allergies: this.parseJsonField(profile.allergies),
      medications: this.parseJsonField(profile.medications),
      dietaryRestrictions: this.parseJsonField(profile.dietaryRestrictions),
      healthGoals: this.parseJsonField(profile.healthGoals),
    }));
  }

  // Helper to safely parse JSON fields (handles both SQLite strings and PostgreSQL JSON)
  private parseJsonField(field: any): any[] {
    if (Array.isArray(field)) {
      return field; // Already an array (PostgreSQL native JSON)
    }
    if (typeof field === 'string') {
      try {
        return JSON.parse(field); // SQLite JSON string
      } catch {
        return []; // Invalid JSON, return empty array
      }
    }
    return []; // null, undefined, or other types
  }

  async createHealthProfile(insertProfile: InsertHealthProfile & {userId: string}): Promise<HealthProfile> {
    return withDbErrorHandling(async () => {
      if (!insertProfile.userId) {
        throw new DatabaseError('User ID is required to create health profile');
      }
      if (!insertProfile.name) {
        throw new DatabaseError('Name is required to create health profile');
      }

      const profileData: any = { ...insertProfile };

      // Always stringify arrays for Drizzle's JSON mode, regardless of database type
      // Drizzle schema uses text("field", { mode: 'json' }) which expects JSON strings
      profileData.medicalConditions = JSON.stringify(insertProfile.medicalConditions || []);
      profileData.allergies = JSON.stringify(insertProfile.allergies || []);
      profileData.medications = JSON.stringify(insertProfile.medications || []);
      profileData.dietaryRestrictions = JSON.stringify(insertProfile.dietaryRestrictions || []);
      profileData.healthGoals = JSON.stringify(insertProfile.healthGoals || []);
      profileData.smokingStatus = insertProfile.smokingStatus || 'never';

      const result = await db.insert(healthProfiles).values(profileData).returning();

      if (!result[0]) {
        throw new DatabaseError('Failed to create health profile');
      }

      return result[0];
    }, 'Failed to create health profile');
  }

  async updateHealthProfile(id: string, profile: Partial<InsertHealthProfile>): Promise<HealthProfile | undefined> {
    const profileData: any = { ...profile };

    // Always stringify arrays for Drizzle's JSON mode, regardless of database type
    // Drizzle schema uses text("field", { mode: 'json' }) which expects JSON strings
    if (profileData.medicalConditions && Array.isArray(profileData.medicalConditions)) {
      profileData.medicalConditions = JSON.stringify(profileData.medicalConditions);
    }
    if (profileData.allergies && Array.isArray(profileData.allergies)) {
      profileData.allergies = JSON.stringify(profileData.allergies);
    }
    if (profileData.medications && Array.isArray(profileData.medications)) {
      profileData.medications = JSON.stringify(profileData.medications);
    }
    if (profileData.dietaryRestrictions && Array.isArray(profileData.dietaryRestrictions)) {
      profileData.dietaryRestrictions = JSON.stringify(profileData.dietaryRestrictions);
    }
    if (profileData.healthGoals && Array.isArray(profileData.healthGoals)) {
      profileData.healthGoals = JSON.stringify(profileData.healthGoals);
    }

    const result = await db.update(healthProfiles)
      .set({
        ...profileData,
        // PostgreSQL needs Date object, SQLite needs ISO string
        // Drizzle handles the conversion based on schema
        updatedAt: new Date(),
      })
      .where(eq(healthProfiles.id, id))
      .returning();
    return result[0];
  }

  // Food Entry operations
  async getFoodEntries(profileId: string, date?: string): Promise<FoodEntry[]> {
    if (date) {
      return await db.select().from(foodEntries).where(and(
        eq(foodEntries.profileId, profileId),
        eq(foodEntries.entryDate, date)
      ));
    }

    return await db.select().from(foodEntries).where(eq(foodEntries.profileId, profileId));
  }

  async getFoodEntry(id: string): Promise<FoodEntry | undefined> {
    const result = await db.select().from(foodEntries).where(eq(foodEntries.id, id));
    return result[0];
  }

  async createFoodEntry(entry: InsertFoodEntry): Promise<FoodEntry> {
    const result = await db.insert(foodEntries).values(entry).returning();
    return result[0];
  }

  async deleteFoodEntry(id: string): Promise<boolean> {
    try {
      // First check if the entry exists
      const existingEntry = await db.select().from(foodEntries).where(eq(foodEntries.id, id));
      console.log('Entry exists before delete:', existingEntry.length > 0);

      if (existingEntry.length === 0) {
        console.log('Entry not found, cannot delete');
        return false;
      }

      const result = await db.delete(foodEntries).where(eq(foodEntries.id, id));
      console.log('Delete result:', result);
      console.log('Delete result type:', typeof result);
      console.log('Delete result keys:', Object.keys(result || {}));

      // Check if entry still exists after delete
      const stillExists = await db.select().from(foodEntries).where(eq(foodEntries.id, id));
      console.log('Entry still exists after delete:', stillExists.length > 0);

      // Return true if the entry was successfully deleted (no longer exists)
      return stillExists.length === 0;
    } catch (error) {
      console.error('Error in deleteFoodEntry:', error);
      return false;
    }
  }

  // Insights operations
  async getInsight(profileId: string, date: string): Promise<Insight | undefined> {
    const result = await db.select().from(insights)
      .where(and(
        eq(insights.profileId, profileId),
        eq(insights.type, 'daily_analysis')
      ));

    // Filter by date in the JSON data field
    const insightForDate = result.find(insight => {
      try {
        const data = typeof insight.data === 'string' ? JSON.parse(insight.data) : insight.data;
        return data?.date === date;
      } catch {
        return false;
      }
    });

    if (!insightForDate) return undefined;

    // Transform SQLite format to interface format
    const data = typeof insightForDate.data === 'string' ? JSON.parse(insightForDate.data) : insightForDate.data;
    return {
      ...data,
      id: insightForDate.id,
      profileId: insightForDate.profileId,
      createdAt: insightForDate.createdAt ? new Date(insightForDate.createdAt) : null,
    };
  }

  async createInsight(insertInsight: InsertInsight): Promise<Insight> {
    const result = await db.insert(insights).values(insertInsight).returning();
    const sqliteInsight = result[0];

    // Transform SQLite format to interface format
    const data = typeof sqliteInsight.data === 'string' ? JSON.parse(sqliteInsight.data) : sqliteInsight.data;
    return {
      ...data,
      id: sqliteInsight.id,
      profileId: sqliteInsight.profileId,
      createdAt: sqliteInsight.createdAt ? new Date(sqliteInsight.createdAt) : null,
    };
  }

  async updateInsight(id: string, insight: Partial<InsertInsight>): Promise<Insight | undefined> {
    const result = await db.update(insights)
      .set(insight)
      .where(eq(insights.id, id))
      .returning();

    const sqliteInsight = result[0];
    if (!sqliteInsight) return undefined;

    // Transform SQLite format to interface format
    const data = typeof sqliteInsight.data === 'string' ? JSON.parse(sqliteInsight.data) : sqliteInsight.data;
    return {
      ...data,
      id: sqliteInsight.id,
      profileId: sqliteInsight.profileId,
      createdAt: sqliteInsight.createdAt ? new Date(sqliteInsight.createdAt) : null,
    };
  }
}

// Create and export the storage instance
export const storage = new DatabaseStorage();