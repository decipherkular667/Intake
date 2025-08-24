import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Insight } from "@shared/schema";

export function useInsights(profileId: string = "default", date?: string) {
  const currentDate = date || new Date().toISOString().split('T')[0];

  const { data: insights, isLoading } = useQuery({
    queryKey: ["/api/insights", profileId, currentDate],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/insights/${profileId}/${currentDate}`);
      return response.json() as Promise<Insight>;
    },
  });

  return {
    insights,
    isLoading,
  };
}
