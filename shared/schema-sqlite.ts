import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = sqliteTable("users", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // hashed password
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  emailVerified: integer("email_verified", { mode: 'boolean' }).default(false),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  lastLoginAt: text("last_login_at"), // ISO string
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const healthProfiles = sqliteTable("health_profiles", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  userId: text("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  gender: text("gender"), // 'male' or 'female'
  height: integer("height").notNull(), // in cm
  weight: integer("weight").notNull(), // in kg
  birthYear: integer("birth_year").notNull(),
  birthMonth: integer("birth_month").notNull(),
  medicalConditions: text("medical_conditions", { mode: 'json' }).default("[]"), // JSON array
  allergies: text("allergies", { mode: 'json' }).default("[]"), // JSON array
  medications: text("medications", { mode: 'json' }).default("[]"), // JSON array
  smokingStatus: text("smoking_status"),
  smokingFrequency: text("smoking_frequency"),
  activityLevel: text("activity_level"),
  dietaryRestrictions: text("dietary_restrictions", { mode: 'json' }).default("[]"),
  healthGoals: text("health_goals", { mode: 'json' }).default("[]"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const foodEntries = sqliteTable("food_entries", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  profileId: text("profile_id").references(() => healthProfiles.id).notNull(),
  foodName: text("food_name").notNull(),
  servingSize: real("serving_size").notNull(),
  servingUnit: text("serving_unit").notNull(),
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner, snack
  entryDate: text("entry_date").notNull(), // YYYY-MM-DD format
  nutritionData: text("nutrition_data", { mode: 'json' }),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insights = sqliteTable("insights", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  profileId: text("profile_id").references(() => healthProfiles.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // nutrition, health, tcm, etc.
  data: text("data", { mode: 'json' }), // Additional structured data including all insight fields
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const rateLimits = sqliteTable("rate_limits", {
  userId: text("user_id").primaryKey().references(() => users.id).notNull(),
  minuteCount: integer("minute_count").notNull().default(0),
  minuteResetAt: integer("minute_reset_at").notNull(), // Unix timestamp in milliseconds
  hourCount: integer("hour_count").notNull().default(0),
  hourResetAt: integer("hour_reset_at").notNull(), // Unix timestamp in milliseconds
  dayCount: integer("day_count").notNull().default(0),
  dayResetAt: integer("day_reset_at").notNull(), // Unix timestamp in milliseconds
  totalRequests: integer("total_requests").notNull().default(0), // Lifetime total
  lastRequestAt: integer("last_request_at"), // Unix timestamp in milliseconds
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Insert schemas
export const insertHealthProfileSchema = createInsertSchema(healthProfiles).omit({
  id: true,
  userId: true, // Server adds this automatically
  createdAt: true,
  updatedAt: true,
}).extend({
  // Make optional fields more lenient
  gender: z.enum(['male', 'female']).optional(),
  smokingStatus: z.string().optional(),
  smokingFrequency: z.string().optional(),
  activityLevel: z.string().optional(),
  medicalConditions: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  medications: z.array(z.string()).default([]),
  dietaryRestrictions: z.array(z.string()).default([]),
  healthGoals: z.array(z.string()).default([]),
});

export const insertFoodEntrySchema = createInsertSchema(foodEntries).omit({
  id: true,
  createdAt: true,
}).extend({
  servingSize: z.number().positive("Serving size must be positive"),
});

// API schema for food entries (excludes profileId since server adds it)
export const apiFoodEntrySchema = createInsertSchema(foodEntries).omit({
  id: true,
  createdAt: true,
  profileId: true,
}).extend({
  servingSize: z.number().positive("Serving size must be positive"),
});

export const insertInsightSchema = createInsertSchema(insights).omit({
  id: true,
  createdAt: true,
});

// User schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/(?=.*[a-z])/, "Password must contain at least one lowercase letter")
    .regex(/(?=.*[A-Z])/, "Password must contain at least one uppercase letter")
    .regex(/(?=.*\d)/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Type exports
export type DatabaseUser = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Clean user type for authentication
export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

// Health profile types
export type HealthProfile = typeof healthProfiles.$inferSelect;
export type InsertHealthProfile = z.infer<typeof insertHealthProfileSchema>;

// Food entry types
export type FoodEntry = typeof foodEntries.$inferSelect;
export type InsertFoodEntry = z.infer<typeof insertFoodEntrySchema>;

// Insights types
export type Insight = typeof insights.$inferSelect;
export type InsertInsight = z.infer<typeof insertInsightSchema>;

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

// Nutrition data structure
export type NutritionData = {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminE?: number;
  vitaminK?: number;
  vitaminB6?: number;
  vitaminB12?: number;
  folate?: number;
  niacin?: number;
  riboflavin?: number;
  thiamine?: number;
  magnesium?: number;
  phosphorus?: number;
  zinc?: number;
  copper?: number;
  manganese?: number;
  selenium?: number;
  alcohol?: number;
  caffeine?: number;
  bioactive?: Record<string, number>;
  vitamins?: Record<string, number>;
  minerals?: Record<string, number>;
};

// Conflict result structure
export type ConflictResult = {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  foodItem: string;
};

// Recommendation structure
export type Recommendation = {
  type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  confidence: number;
  specificActions: string[];
  expectedBenefit: string;
  aiReasoning: string;
};