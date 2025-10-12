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
  alcohol?: number;
  caffeine?: number;
  bioactive?: Record<string, number>;
  vitamins?: Record<string, number>;
  minerals?: Record<string, number>;
};

export type AIInsightsRequest = {
  profileId: string;
  foodData: any[];
  healthProfile: {
    age?: number;
    gender?: string;
    weight?: number;
    height?: number;
    activityLevel?: string;
    conditions?: string[];
    medications?: string[];
    goals?: string[];
    allergies?: string[];
  };
  analysisDate: string;
  includeWeeklySummary?: boolean;
  includeTCMRecommendations?: boolean;
};

export type AIInsightsResponse = {
  status: 'safe' | 'caution' | 'avoid';
  healthScore: number;
  healthScoreExplanation: string;
  conflicts: Array<{
    severity: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    confidence: number;
    aiReasoning: string;
  }>;
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
    sugar: number;
  };
  recommendations: Array<{
    type: 'diet' | 'lifestyle' | 'tcm';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    confidence: number;
    specificActions: string[];
    expectedBenefit: string;
    aiReasoning: string;
  }>;
  nutritionRecommendations: {
    calories: string;
    protein: string;
    carbs: string;
    fiber: string;
  };
  nutritionSummary: string;
  weeklySummary?: {
    period: string;
    averages: any;
    varietyScore: number;
    daysTracked: number;
    insights: Array<{
      message: string;
      confidence: number;
      actionable: string;
    }>;
    aiAnalysis: string;
    keyTakeaways: string[];
  };
  recommendationsAiGenerated: boolean;
  aiGenerated: boolean;
  safetyMessage: string;
};

export const foodApi = {
  search: async (query: string): Promise<{ foods: FoodSearchResult[]; source?: string }> => {
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

// New AI Insights API
export const aiInsightsApi = {
  analyzeNutrition: async (data: AIInsightsRequest): Promise<AIInsightsResponse> => {
    const response = await apiRequest("POST", "/api/ai/analyze-nutrition", data);
    return response.json();
  },

  calculatePersonalizedTargets: async (profile: {
    age: number;
    gender: string;
    weight: number;
    height: number;
    activityLevel: string;
    healthConditions?: string[];
    goals?: string[];
  }) => {
    const response = await apiRequest("POST", "/api/ai/calculate-targets", profile);
    return response.json();
  },

  translateBatch: async (texts: string[], targetLanguage: string): Promise<{ translations: string[] }> => {
    const response = await apiRequest("POST", "/api/translate-batch", { texts, targetLanguage });
    return response.json();
  },
};