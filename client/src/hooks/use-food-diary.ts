import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { foodApi } from "@/lib/api";
import type { FoodEntry, InsertFoodEntry } from "@shared/schema";

export function useFoodDiary(profileId: string = "default", date?: string) {
  const queryClient = useQueryClient();
  const currentDate = date || new Date().toISOString().split('T')[0];

  const { data: foodEntries = [], isLoading } = useQuery({
    queryKey: ["/api/food-entries", profileId, currentDate],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/food-entries/${profileId}?date=${currentDate}`);
      return response.json() as Promise<FoodEntry[]>;
    },
  });

  const { mutateAsync: addFoodEntry, isPending: isAdding } = useMutation({
    mutationFn: async (data: InsertFoodEntry) => {
      const response = await apiRequest("POST", "/api/food-entries", data);
      return response.json() as Promise<FoodEntry>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-entries", profileId] });
      queryClient.invalidateQueries({ queryKey: ["/api/insights", profileId] });
    },
  });

  const { mutateAsync: deleteFoodEntry, isPending: isDeleting } = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await apiRequest("DELETE", `/api/food-entries/${entryId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-entries", profileId] });
      queryClient.invalidateQueries({ queryKey: ["/api/insights", profileId] });
    },
  });

  const searchFood = async (query: string) => {
    const result = await foodApi.search(query);
    return result.foods;
  };

  const getNutrition = async (foodId: string) => {
    return await foodApi.getNutrition(foodId);
  };

  return {
    foodEntries,
    isLoading: isLoading || isAdding || isDeleting,
    addFoodEntry,
    deleteFoodEntry,
    searchFood,
    getNutrition,
  };
}
