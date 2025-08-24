import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertHealthProfileSchema, insertFoodEntrySchema, insertInsightSchema } from "@shared/schema";
import type { NutritionData, ConflictResult, Recommendation } from "@shared/schema";
import axios from "axios";
import fs from "fs";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health Profile Routes
  app.post("/api/health-profile", async (req, res) => {
    try {
      const validatedData = insertHealthProfileSchema.parse(req.body);
      const profile = await storage.createHealthProfile(validatedData);
      res.json(profile);
    } catch (error) {
      res.status(400).json({ message: "Invalid health profile data" });
    }
  });

  app.get("/api/health-profile/:id", async (req, res) => {
    try {
      const profile = await storage.getHealthProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ message: "Health profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch health profile" });
    }
  });

  app.put("/api/health-profile/:id", async (req, res) => {
    try {
      const validatedData = insertHealthProfileSchema.partial().parse(req.body);
      const profile = await storage.updateHealthProfile(req.params.id, validatedData);
      if (!profile) {
        return res.status(404).json({ message: "Health profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(400).json({ message: "Invalid health profile data" });
    }
  });

  // Food Search and Nutrition API
  app.get("/api/food/search", async (req, res) => {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ message: "Search query required" });
    }

    try {
      // Try USDA API first
      const usdaApiKey = process.env.USDA_API_KEY || process.env.FOOD_API_KEY || "DEMO_KEY";
      const usdaResponse = await axios.get(`https://api.nal.usda.gov/fdc/v1/foods/search`, {
        params: {
          query,
          api_key: usdaApiKey,
          pageSize: 10,
        },
        timeout: 5000,
      });

      const foods = usdaResponse.data.foods.map((food: any) => ({
        id: food.fdcId,
        name: food.description,
        brand: food.brandName || null,
        nutrients: food.foodNutrients?.reduce((acc: any, nutrient: any) => {
          acc[nutrient.nutrientName] = nutrient.value;
          return acc;
        }, {}),
      }));

      res.json({ foods });
    } catch (error) {
      // Fallback to local food database
      try {
        const localFoodDb = JSON.parse(
          fs.readFileSync(path.join(import.meta.dirname, "data", "food-database.json"), "utf-8")
        );
        
        const filteredFoods = localFoodDb.filter((food: any) =>
          food.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10);

        res.json({ foods: filteredFoods });
      } catch (fallbackError) {
        res.status(500).json({ message: "Food search service unavailable" });
      }
    }
  });

  app.get("/api/food/nutrition/:foodId", async (req, res) => {
    try {
      // Try USDA API
      const usdaApiKey = process.env.USDA_API_KEY || process.env.FOOD_API_KEY || "DEMO_KEY";
      const usdaResponse = await axios.get(`https://api.nal.usda.gov/fdc/v1/food/${req.params.foodId}`, {
        params: { api_key: usdaApiKey },
        timeout: 5000,
      });

      const food = usdaResponse.data;
      const nutritionData: NutritionData = {
        calories: food.foodNutrients?.find((n: any) => n.nutrient.name === "Energy")?.amount || 0,
        protein: food.foodNutrients?.find((n: any) => n.nutrient.name === "Protein")?.amount || 0,
        carbs: food.foodNutrients?.find((n: any) => n.nutrient.name === "Carbohydrate, by difference")?.amount || 0,
        fat: food.foodNutrients?.find((n: any) => n.nutrient.name === "Total lipid (fat)")?.amount || 0,
        fiber: food.foodNutrients?.find((n: any) => n.nutrient.name === "Fiber, total dietary")?.amount || 0,
        sugar: food.foodNutrients?.find((n: any) => n.nutrient.name === "Sugars, total including NLEA")?.amount || 0,
        sodium: food.foodNutrients?.find((n: any) => n.nutrient.name === "Sodium, Na")?.amount || 0,
      };

      res.json({ nutrition: nutritionData });
    } catch (error) {
      // Fallback to local nutrition data
      try {
        const localFoodDb = JSON.parse(
          fs.readFileSync(path.join(import.meta.dirname, "data", "food-database.json"), "utf-8")
        );
        
        const food = localFoodDb.find((f: any) => f.id === req.params.foodId);
        if (!food) {
          return res.status(404).json({ message: "Food not found" });
        }

        res.json({ nutrition: food.nutrition });
      } catch (fallbackError) {
        res.status(500).json({ message: "Nutrition data unavailable" });
      }
    }
  });

  // Food Entry Routes
  app.get("/api/food-entries/:profileId", async (req, res) => {
    try {
      const date = req.query.date as string;
      const entries = await storage.getFoodEntries(req.params.profileId, date);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch food entries" });
    }
  });

  app.post("/api/food-entries", async (req, res) => {
    try {
      const validatedData = insertFoodEntrySchema.parse(req.body);
      const entry = await storage.createFoodEntry(validatedData);
      res.json(entry);
    } catch (error) {
      res.status(400).json({ message: "Invalid food entry data" });
    }
  });

  app.delete("/api/food-entries/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteFoodEntry(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Food entry not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete food entry" });
    }
  });

  // Insights and Conflict Detection
  app.get("/api/insights/:profileId/:date", async (req, res) => {
    try {
      const { profileId, date } = req.params;
      
      // Get existing insight or generate new one
      let insight = await storage.getInsight(profileId, date);
      
      if (!insight) {
        // Generate insights
        const profile = await storage.getHealthProfile(profileId);
        const entries = await storage.getFoodEntries(profileId, date);
        
        if (!profile) {
          return res.status(404).json({ message: "Health profile not found" });
        }

        const conflicts = await detectConflicts(profile, entries);
        const recommendations = await generateRecommendations(profile, entries);
        const healthScore = calculateHealthScore(profile, entries, conflicts);
        const status = determineStatus(conflicts);

        insight = await storage.createInsight({
          profileId,
          date,
          conflicts,
          recommendations,
          healthScore,
          status,
        });
      }

      res.json(insight);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  // Medical Conditions Autocomplete
  app.get("/api/medical-conditions", async (req, res) => {
    try {
      const query = req.query.q as string;
      const conditions = JSON.parse(
        fs.readFileSync(path.join(import.meta.dirname, "data", "medical-conditions.json"), "utf-8")
      );
      
      if (query) {
        const filtered = conditions.filter((condition: string) =>
          condition.toLowerCase().includes(query.toLowerCase())
        );
        res.json(filtered.slice(0, 10));
      } else {
        res.json(conditions.slice(0, 20));
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch medical conditions" });
    }
  });

  // Nutrient Information
  app.get("/api/nutrients/:name", async (req, res) => {
    try {
      const nutrients = JSON.parse(
        fs.readFileSync(path.join(import.meta.dirname, "data", "nutrients.json"), "utf-8")
      );
      
      const nutrient = nutrients.find((n: any) => 
        n.name.toLowerCase() === req.params.name.toLowerCase()
      );
      
      if (!nutrient) {
        return res.status(404).json({ message: "Nutrient information not found" });
      }
      
      res.json(nutrient);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch nutrient information" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions for conflict detection and recommendations
async function detectConflicts(profile: any, entries: any[]): Promise<ConflictResult[]> {
  const conflicts: ConflictResult[] = [];
  
  // Check allergies against food entries
  for (const entry of entries) {
    for (const allergy of profile.allergies || []) {
      if (entry.foodName.toLowerCase().includes(allergy.toLowerCase())) {
        conflicts.push({
          type: "allergy",
          severity: "high",
          description: `${entry.foodName} may contain ${allergy}, which you're allergic to`,
          foodItem: entry.foodName,
        });
      }
    }
  }

  // Check medical conditions against nutrients
  for (const condition of profile.medicalConditions || []) {
    for (const entry of entries) {
      const nutrition = entry.nutritionData as NutritionData;
      
      if (condition.toLowerCase().includes("diabetes") && nutrition.sugar > 20) {
        conflicts.push({
          type: "condition",
          severity: "medium",
          description: `High sugar content in ${entry.foodName} may affect blood sugar levels`,
          foodItem: entry.foodName,
        });
      }
      
      if (condition.toLowerCase().includes("hypertension") && nutrition.sodium > 500) {
        conflicts.push({
          type: "condition",
          severity: "medium",
          description: `High sodium content in ${entry.foodName} may affect blood pressure`,
          foodItem: entry.foodName,
        });
      }
    }
  }

  return conflicts;
}

async function generateRecommendations(profile: any, entries: any[]): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];
  
  // Diet optimization recommendations
  const totalCalories = entries.reduce((sum, entry) => sum + (entry.nutritionData?.calories || 0), 0);
  const totalProtein = entries.reduce((sum, entry) => sum + (entry.nutritionData?.protein || 0), 0);
  
  if (totalProtein < 50) {
    recommendations.push({
      type: "diet",
      title: "Increase Protein Intake",
      description: "Consider adding lean proteins like chicken, fish, or legumes to meet daily requirements",
      priority: "medium",
    });
  }
  
  if (profile.medicalConditions?.some((c: string) => c.toLowerCase().includes("diabetes"))) {
    recommendations.push({
      type: "diet",
      title: "Blood Sugar Management",
      description: "Consider pairing carbohydrates with protein or fiber to help stabilize blood sugar",
      priority: "high",
    });
  }

  // TCM recommendations
  recommendations.push({
    type: "tcm",
    title: "Seasonal Balance",
    description: "Include warming foods like ginger and cinnamon to support digestive health",
    priority: "low",
  });

  return recommendations;
}

function calculateHealthScore(profile: any, entries: any[], conflicts: ConflictResult[]): number {
  let score = 8; // Base score
  
  // Reduce score for high-severity conflicts
  const highSeverityConflicts = conflicts.filter(c => c.severity === "high").length;
  score -= highSeverityConflicts * 2;
  
  // Reduce score for medium-severity conflicts
  const mediumSeverityConflicts = conflicts.filter(c => c.severity === "medium").length;
  score -= mediumSeverityConflicts * 1;
  
  return Math.max(1, Math.min(10, score));
}

function determineStatus(conflicts: ConflictResult[]): string {
  const hasHighSeverity = conflicts.some(c => c.severity === "high");
  const hasMediumSeverity = conflicts.some(c => c.severity === "medium");
  
  if (hasHighSeverity) return "avoid";
  if (hasMediumSeverity) return "caution";
  return "safe";
}
