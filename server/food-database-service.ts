import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface FoodItem {
  fdc_id: string;
  description: string;
  food_category_id: string;
}

interface NutrientData {
  fdc_id: string;
  nutrient_id: string;
  amount: string;
}

interface NutrientInfo {
  id: string;
  name: string;
  unit_name: string;
  nutrient_nbr: string;
}

class FoodDatabaseService {
  private foods: FoodItem[] = [];
  private nutrients: Map<string, NutrientInfo> = new Map();
  private foodNutrients: Map<string, NutrientData[]> = new Map();
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    try {
      const dataDir = path.join(__dirname, 'data', 'FoodData_Central_survey_food_csv_2024-10-31');
      
      // Load foods
      const foodsData = fs.readFileSync(path.join(dataDir, 'food.csv'), 'utf-8');
      this.foods = this.parseCSV(foodsData).slice(1, 5000).map(row => ({
        fdc_id: row[0],
        description: row[2].replace(/"/g, ''),
        food_category_id: row[3]
      }));

      // Load nutrients reference
      const nutrientsData = fs.readFileSync(path.join(dataDir, 'nutrient.csv'), 'utf-8');
      this.parseCSV(nutrientsData).slice(1).forEach(row => {
        this.nutrients.set(row[0], {
          id: row[0],
          name: row[1].replace(/"/g, ''),
          unit_name: row[2].replace(/"/g, ''),
          nutrient_nbr: row[3]
        });
      });

      // Load food nutrients (limit for performance)
      const foodNutrientsData = fs.readFileSync(path.join(dataDir, 'food_nutrient.csv'), 'utf-8');
      this.parseCSV(foodNutrientsData).slice(1, 50000).forEach(row => {
        const fdcId = row[1];
        if (!this.foodNutrients.has(fdcId)) {
          this.foodNutrients.set(fdcId, []);
        }
        this.foodNutrients.get(fdcId)!.push({
          fdc_id: fdcId,
          nutrient_id: row[2],
          amount: row[3]
        });
      });

      this.initialized = true;
      console.log(`Loaded ${this.foods.length} foods and ${this.nutrients.size} nutrients from USDA database`);
    } catch (error) {
      console.error('Failed to initialize food database:', error);
    }
  }

  private parseCSV(data: string): string[][] {
    const lines = data.split('\n');
    return lines.map(line => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    });
  }

  async searchFoods(query: string, limit = 10) {
    await this.initialize();
    
    const searchTerm = query.toLowerCase();
    const matches = this.foods
      .filter(food => food.description.toLowerCase().includes(searchTerm))
      .slice(0, limit);
    
    return matches.map(food => ({
      id: food.fdc_id,
      name: food.description,
      brand: null
    }));
  }

  async getNutrition(fdcId: string) {
    await this.initialize();
    
    const foodNutrients = this.foodNutrients.get(fdcId) || [];
    
    // Map important nutrients
    const nutritionData = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      vitamins: {} as Record<string, number>,
      minerals: {} as Record<string, number>
    };

    foodNutrients.forEach(nutrientData => {
      const nutrient = this.nutrients.get(nutrientData.nutrient_id);
      if (!nutrient) return;

      const amount = parseFloat(nutrientData.amount) || 0;
      const name = nutrient.name.toLowerCase();

      // Map macronutrients
      if (name.includes('energy') && nutrient.unit_name === 'KCAL') {
        nutritionData.calories = amount;
      } else if (name === 'protein') {
        nutritionData.protein = amount;
      } else if (name === 'carbohydrate, by difference') {
        nutritionData.carbs = amount;
      } else if (name === 'total lipid (fat)') {
        nutritionData.fat = amount;
      } else if (name === 'fiber, total dietary') {
        nutritionData.fiber = amount;
      } else if (name.includes('sugars, total')) {
        nutritionData.sugar = amount;
      } else if (name === 'sodium, na') {
        nutritionData.sodium = amount;
      }
      // Map vitamins
      else if (name.includes('vitamin c')) {
        nutritionData.vitamins.vitamin_c = amount;
      } else if (name.includes('vitamin a') && name.includes('rae')) {
        nutritionData.vitamins.vitamin_a = amount;
      } else if (name.includes('vitamin e')) {
        nutritionData.vitamins.vitamin_e = amount;
      } else if (name.includes('vitamin k')) {
        nutritionData.vitamins.vitamin_k = amount;
      } else if (name.includes('thiamin')) {
        nutritionData.vitamins.vitamin_b1 = amount;
      } else if (name.includes('riboflavin')) {
        nutritionData.vitamins.vitamin_b2 = amount;
      } else if (name.includes('niacin')) {
        nutritionData.vitamins.vitamin_b3 = amount;
      } else if (name.includes('vitamin b-6')) {
        nutritionData.vitamins.vitamin_b6 = amount;
      } else if (name.includes('folate') && name.includes('total')) {
        nutritionData.vitamins.folate = amount;
      } else if (name.includes('vitamin b-12')) {
        nutritionData.vitamins.vitamin_b12 = amount;
      }
      // Map minerals
      else if (name.includes('calcium')) {
        nutritionData.minerals.calcium = amount;
      } else if (name.includes('iron')) {
        nutritionData.minerals.iron = amount;
      } else if (name.includes('magnesium')) {
        nutritionData.minerals.magnesium = amount;
      } else if (name.includes('phosphorus')) {
        nutritionData.minerals.phosphorus = amount;
      } else if (name.includes('potassium')) {
        nutritionData.minerals.potassium = amount;
      } else if (name.includes('zinc')) {
        nutritionData.minerals.zinc = amount;
      } else if (name.includes('copper')) {
        nutritionData.minerals.copper = amount;
      } else if (name.includes('manganese')) {
        nutritionData.minerals.manganese = amount;
      } else if (name.includes('selenium')) {
        nutritionData.minerals.selenium = amount;
      }
    });

    // Clean up empty vitamins/minerals
    if (Object.keys(nutritionData.vitamins).length === 0) {
      delete (nutritionData as any).vitamins;
    }
    if (Object.keys(nutritionData.minerals).length === 0) {
      delete (nutritionData as any).minerals;
    }

    return { nutrition: nutritionData };
  }

  // Get most common/popular foods for quick access
  getPopularFoods() {
    const popularDescriptions = [
      'apple', 'banana', 'chicken breast', 'salmon', 'broccoli', 'spinach', 
      'egg', 'milk', 'bread', 'rice', 'potato', 'carrot', 'tomato', 'orange',
      'yogurt', 'cheese', 'oatmeal', 'pasta', 'beans', 'nuts'
    ];
    
    return popularDescriptions.map(desc => {
      const match = this.foods.find(food => 
        food.description.toLowerCase().includes(desc)
      );
      return match ? {
        id: match.fdc_id,
        name: match.description,
        brand: null
      } : null;
    }).filter(Boolean);
  }
}

export const foodDatabase = new FoodDatabaseService();