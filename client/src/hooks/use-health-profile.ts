import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { HealthProfile, InsertHealthProfile } from "@shared/schema";

export function useHealthProfile(profileId?: string) {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/health-profile", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/health-profile/${profileId}`);
      return response.json() as Promise<HealthProfile>;
    },
  });

  const { mutateAsync: createHealthProfile, isPending: isCreating } = useMutation({
    mutationFn: async (data: InsertHealthProfile) => {
      const response = await apiRequest("POST", "/api/health-profile", data);
      return response.json() as Promise<HealthProfile>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-profile"] });
    },
  });

  const { mutateAsync: updateHealthProfile, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertHealthProfile> }) => {
      const response = await apiRequest("PUT", `/api/health-profile/${id}`, data);
      return response.json() as Promise<HealthProfile>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-profile"] });
    },
  });

  return {
    profile,
    isLoading,
    createHealthProfile,
    isCreating,
    updateHealthProfile,
    isUpdating,
  };
}
