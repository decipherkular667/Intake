import { 
  type HealthProfile, 
  type InsertHealthProfile,
  type FoodEntry,
  type InsertFoodEntry,
  type Insight,
  type InsertInsight
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Health Profile operations
  getHealthProfile(id: string): Promise<HealthProfile | undefined>;
  createHealthProfile(profile: InsertHealthProfile): Promise<HealthProfile>;
  updateHealthProfile(id: string, profile: Partial<InsertHealthProfile>): Promise<HealthProfile | undefined>;
  
  // Food Entry operations
  getFoodEntries(profileId: string, date?: string): Promise<FoodEntry[]>;
  createFoodEntry(entry: InsertFoodEntry): Promise<FoodEntry>;
  deleteFoodEntry(id: string): Promise<boolean>;
  
  // Insights operations
  getInsight(profileId: string, date: string): Promise<Insight | undefined>;
  createInsight(insight: InsertInsight): Promise<Insight>;
  updateInsight(id: string, insight: Partial<InsertInsight>): Promise<Insight | undefined>;
}

export class MemStorage implements IStorage {
  private healthProfiles: Map<string, HealthProfile>;
  private foodEntries: Map<string, FoodEntry>;
  private insights: Map<string, Insight>;

  constructor() {
    this.healthProfiles = new Map();
    this.foodEntries = new Map();
    this.insights = new Map();
  }

  async getHealthProfile(id: string): Promise<HealthProfile | undefined> {
    return this.healthProfiles.get(id);
  }

  async createHealthProfile(insertProfile: InsertHealthProfile, id?: string): Promise<HealthProfile> {
    const profileId = id || randomUUID();
    const profile: HealthProfile = {
      ...insertProfile,
      id: profileId,
      medicalConditions: insertProfile.medicalConditions || [],
      allergies: insertProfile.allergies || [],
      medications: insertProfile.medications || [],
      smokingFrequency: insertProfile.smokingFrequency || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.healthProfiles.set(profileId, profile);
    return profile;
  }

  async updateHealthProfile(id: string, updates: Partial<InsertHealthProfile>): Promise<HealthProfile | undefined> {
    const existing = this.healthProfiles.get(id);
    if (!existing) return undefined;
    
    const updated: HealthProfile = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.healthProfiles.set(id, updated);
    return updated;
  }

  async getFoodEntries(profileId: string, date?: string): Promise<FoodEntry[]> {
    const entries = Array.from(this.foodEntries.values()).filter(
      entry => entry.profileId === profileId && (!date || entry.entryDate === date)
    );
    return entries.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createFoodEntry(insertEntry: InsertFoodEntry): Promise<FoodEntry> {
    const id = randomUUID();
    const entry: FoodEntry = {
      ...insertEntry,
      id,
      profileId: insertEntry.profileId || null,
      createdAt: new Date(),
    };
    this.foodEntries.set(id, entry);
    return entry;
  }

  async deleteFoodEntry(id: string): Promise<boolean> {
    return this.foodEntries.delete(id);
  }

  async getInsight(profileId: string, date: string): Promise<Insight | undefined> {
    return Array.from(this.insights.values()).find(
      insight => insight.profileId === profileId && insight.date === date
    );
  }

  async createInsight(insertInsight: InsertInsight): Promise<Insight> {
    const id = randomUUID();
    const insight: Insight = {
      ...insertInsight,
      id,
      profileId: insertInsight.profileId || null,
      conflicts: insertInsight.conflicts || [],
      recommendations: insertInsight.recommendations || [],
      healthScore: insertInsight.healthScore || null,
      weeklySummary: insertInsight.weeklySummary || null,
      dailyTotals: insertInsight.dailyTotals || null,
      createdAt: new Date(),
    };
    this.insights.set(id, insight);
    return insight;
  }

  async updateInsight(id: string, updates: Partial<InsertInsight>): Promise<Insight | undefined> {
    const existing = this.insights.get(id);
    if (!existing) return undefined;
    
    const updated: Insight = {
      ...existing,
      ...updates,
    };
    this.insights.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
