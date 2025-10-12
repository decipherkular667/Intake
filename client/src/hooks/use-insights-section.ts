// Hook for fetching individual insight sections with caching
import { useQuery, useQueryClient } from '@tanstack/react-query';

export type SectionType = 'conflicts' | 'recommendations' | 'tcm' | 'weekly';

interface UseSectionInsightsOptions {
  profileId: string | undefined;
  date: string;
  section: SectionType;
  enabled: boolean; // Only fetch when user expands the section
}

export function useSectionInsights({ profileId, date, section, enabled }: UseSectionInsightsOptions) {
  return useQuery({
    queryKey: ['insights-section', profileId, date, section],
    queryFn: async () => {
      if (!profileId) {
        throw new Error('Profile ID is required');
      }

      console.log(`🔍 Fetching section: ${section}`);
      const response = await fetch(`/api/insights/${profileId}/${date}/${section}`, {
        method: 'POST',
        credentials: 'include',
      });

      console.log(`📡 Response status for ${section}:`, response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error response for ${section}:`, errorText);
        throw new Error(`Failed to fetch ${section}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`📦 Raw result for ${section}:`, result);

      const data = result.data || result;
      console.log(`📦 Extracted data for ${section}:`, data);

      // Handle weekly section (returns string not array)
      if (section === 'weekly') {
        const aiAnalysis = data.aiAnalysis || '';
        if (!aiAnalysis || aiAnalysis.includes('AI Service Unavailable')) {
          throw new Error('AI Service Unavailable');
        }
        return aiAnalysis;
      } else {
        const finalData = data[section] || data.recommendations || data.conflicts || [];
        console.log(`✅ Final data for ${section}:`, finalData);

        // Return the data as-is (empty arrays are valid - e.g., no conflicts = safe)
        return finalData;
      }
    },
    enabled: enabled && !!profileId,
    staleTime: Infinity, // Never consider data stale
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
    retry: false, // Don't auto-retry - user can manually retry with button
  });
}

/**
 * Invalidate all insights sections when food entries or profile changes
 */
export function useInvalidateInsights() {
  const queryClient = useQueryClient();

  const invalidateAllSections = (profileId: string, date: string) => {
    queryClient.invalidateQueries({
      queryKey: ['insights-section', profileId, date]
    });
  };

  return { invalidateAllSections };
}
