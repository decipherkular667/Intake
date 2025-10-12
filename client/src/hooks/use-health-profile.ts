import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { HealthProfile, InsertHealthProfile } from "@shared/schema-sqlite";
import { useAuth } from "./use-auth";

export function useHealthProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/health-profile"],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/health-profile");
      const result = await response.json();
      // Handle new response format: {success: true, data: HealthProfile}
      return (result.data || result) as HealthProfile;
    },
    retry: false,
  });

  const { mutateAsync: createHealthProfile, isPending: isCreating } = useMutation({
    mutationFn: async (data: Omit<InsertHealthProfile, 'userId'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      const profileData = { ...data, userId: user.id };
      const response = await apiRequest("POST", "/api/health-profile", profileData);
      const result = await response.json();
      // Handle new response format: {success: true, data: HealthProfile}
      return (result.data || result) as HealthProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-profile"] });
      queryClient.invalidateQueries({ queryKey: ["insights-section"] });
    },
  });

  const { mutateAsync: updateHealthProfile, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertHealthProfile> }) => {
      const response = await apiRequest("PUT", `/api/health-profile/${id}`, data);
      const result = await response.json();
      // Handle new response format: {success: true, data: HealthProfile}
      return (result.data || result) as HealthProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-profile"] });
      queryClient.invalidateQueries({ queryKey: ["insights-section"] });
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
