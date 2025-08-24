import { apiRequest } from "./queryClient";

export type FoodSearchResult = {
  id: string;
  name: string;
  brand?: string;
  nutrients?: Record<string, number>;
};

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

export const foodApi = {
  search: async (query: string): Promise<{ foods: FoodSearchResult[] }> => {
    const response = await apiRequest("GET", `/api/food/search?q=${encodeURIComponent(query)}`);
    return response.json();
  },

  getNutrition: async (foodId: string): Promise<{ nutrition: NutritionData }> => {
    const response = await apiRequest("GET", `/api/food/nutrition/${foodId}`);
    return response.json();
  },
};

export const healthApi = {
  searchConditions: async (query: string): Promise<string[]> => {
    const response = await apiRequest("GET", `/api/medical-conditions?q=${encodeURIComponent(query)}`);
    return response.json();
  },

  getNutrientInfo: async (nutrientName: string) => {
    const response = await apiRequest("GET", `/api/nutrients/${nutrientName}`);
    return response.json();
  },
};
