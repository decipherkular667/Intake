import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const healthProfiles = pgTable("health_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  height: integer("height").notNull(), // in cm
  weight: integer("weight").notNull(), // in kg
  birthYear: integer("birth_year").notNull(),
  birthMonth: integer("birth_month").notNull(),
  medicalConditions: text("medical_conditions").array().default([]),
  allergies: text("allergies").array().default([]),
  medications: jsonb("medications").default([]), // {name: string, dosage?: string}[]
  smokingStatus: text("smoking_status").notNull().default("never"), // never, former, current
  smokingFrequency: text("smoking_frequency"), // for current smokers
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const foodEntries = pgTable("food_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").references(() => healthProfiles.id),
  foodName: text("food_name").notNull(),
  servingSize: integer("serving_size").notNull(),
  servingUnit: text("serving_unit").notNull(),
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner, snack
  nutritionData: jsonb("nutrition_data").notNull(), // calories, macros, micros
  entryDate: text("entry_date").notNull(), // YYYY-MM-DD
  createdAt: timestamp("created_at").defaultNow(),
});

export const insights = pgTable("insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").references(() => healthProfiles.id),
  date: text("date").notNull(), // YYYY-MM-DD
  conflicts: jsonb("conflicts").default([]), // conflict detection results
  recommendations: jsonb("recommendations").default([]), // AI recommendations
  healthScore: integer("health_score"), // 1-10
  status: text("status").notNull().default("safe"), // safe, caution, avoid
  weeklySummary: jsonb("weekly_summary"), // AI-powered weekly analysis
  dailyTotals: jsonb("daily_totals"), // Daily nutrition totals
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHealthProfileSchema = createInsertSchema(healthProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFoodEntrySchema = createInsertSchema(foodEntries).omit({
  id: true,
  createdAt: true,
});

export const insertInsightSchema = createInsertSchema(insights).omit({
  id: true,
  createdAt: true,
});

export type InsertHealthProfile = z.infer<typeof insertHealthProfileSchema>;
export type HealthProfile = typeof healthProfiles.$inferSelect;
export type InsertFoodEntry = z.infer<typeof insertFoodEntrySchema>;
export type FoodEntry = typeof foodEntries.$inferSelect;
export type InsertInsight = z.infer<typeof insertInsightSchema>;
export type Insight = typeof insights.$inferSelect;

// Additional types for API responses
export type NutritionData = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  vitamins?: Record<string, number>;
  minerals?: Record<string, number>;
};

export type ConflictResult = {
  type: "allergy" | "condition" | "medication" | "food_interaction";
  severity: "low" | "medium" | "high";
  description: string;
  foodItem: string;
};

export type Recommendation = {
  type: "diet" | "tcm" | "lifestyle";
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
};
