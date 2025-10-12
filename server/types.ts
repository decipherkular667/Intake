// Storage interface types
import type {
  HealthProfile,
  InsertHealthProfile,
  FoodEntry,
  InsertFoodEntry,
  Insight,
  InsertInsight
} from "../shared/schema-sqlite";

export interface IStorage {
  // Health Profile operations
  getHealthProfile(profileId: string): Promise<HealthProfile | null>;
  getHealthProfilesByUser(userId: string): Promise<HealthProfile[]>;
  createHealthProfile(data: InsertHealthProfile): Promise<HealthProfile>;
  updateHealthProfile(profileId: string, updates: Partial<InsertHealthProfile>): Promise<HealthProfile | null>;
  deleteHealthProfile(profileId: string): Promise<boolean>;

  // Food Entry operations
  getFoodEntries(profileId: string, date?: string): Promise<FoodEntry[]>;
  getFoodEntry(entryId: string): Promise<FoodEntry | null>;
  createFoodEntry(entry: InsertFoodEntry): Promise<FoodEntry>;
  updateFoodEntry(entryId: string, updates: Partial<InsertFoodEntry>): Promise<FoodEntry | null>;
  deleteFoodEntry(entryId: string): Promise<boolean>;

  // Insight operations
  getInsights(profileId: string): Promise<Insight[]>;
  getInsight(profileId: string, date: string): Promise<Insight | null>;
  createInsight(insight: InsertInsight): Promise<Insight>;
  updateInsight(insightId: string, updates: Partial<InsertInsight>): Promise<Insight | null>;
  deleteInsight(insightId: string): Promise<boolean>;
}
