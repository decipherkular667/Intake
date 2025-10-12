import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { foodApi } from "@/lib/api";
import type { FoodEntry, InsertFoodEntry } from "@shared/schema-sqlite";
import { useAuth } from "./use-auth";
import { useLanguage } from "@/contexts/language-context";

export function useFoodDiary(date?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { language } = useLanguage();
  const currentDate = date || new Date().toISOString().split('T')[0];

  const { data: foodEntries = [], isLoading } = useQuery({
    queryKey: ["/api/food-entries", currentDate, language],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/food-entries?date=${currentDate}&lang=${language}`);
      const result = await response.json();
      // Handle new response format: {success: true, data: FoodEntry[]}
      return (result.data || result) as FoodEntry[];
    },
    retry: false,
  });

  const { mutateAsync: addFoodEntry, isPending: isAdding } = useMutation({
    mutationFn: async (data: Omit<InsertFoodEntry, 'profileId'>) => {
      const response = await apiRequest("POST", "/api/food-entries", data);
      const result = await response.json();
      // Handle new response format: {success: true, data: FoodEntry}
      return (result.data || result) as FoodEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
      queryClient.invalidateQueries({ queryKey: ["insights-section"] }); // Invalidate cached AI sections
    },
  });

  const { mutateAsync: deleteFoodEntry, isPending: isDeleting } = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await apiRequest("DELETE", `/api/food-entries/${entryId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
      queryClient.invalidateQueries({ queryKey: ["insights-section"] }); // Invalidate cached AI sections
    },
  });

  const searchFood = useCallback(async (query: string) => {
    const result = await foodApi.search(query);
    // Include source information in the returned foods
    return result.foods.map((food: any) => ({
      ...food,
      source: result.source || 'local'
    }));
  }, []);

  const getNutrition = useCallback(async (foodId: string) => {
    return await foodApi.getNutrition(foodId);
  }, []);

  return {
    foodEntries,
    isLoading: isLoading || isAdding || isDeleting,
    addFoodEntry,
    deleteFoodEntry,
    searchFood,
    getNutrition,
  };
}
