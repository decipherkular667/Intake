// client/src/hooks/use-insights.ts
import { useQuery } from '@tanstack/react-query';

export const useInsights = (profileId?: string, date?: string) => {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const { data: insights, isLoading, error } = useQuery({
    queryKey: ['/api/insights', profileId, targetDate],
    queryFn: async () => {
      // Don't fetch if we don't have a valid profile ID
      if (!profileId || profileId === "default") {
        return null;
      }

      try {
        
        console.log('🔍 Fetching AI insights for:', profileId, targetDate);

        // Call the existing insights API (server handles caching)
        const response = await fetch(`/api/insights/${profileId}/${targetDate}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        console.log('🤖 AI API response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('AI API error:', errorText);
          throw new Error(`AI API failed: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('📦 Raw result:', result);

        // Handle response format: {success: true, data: {insight object with nested data field}}
        const insightObject = result.data || result;
        console.log('📦 Insight object:', insightObject);

        // Extract the actual insights from the nested data field
        const aiInsights = insightObject.data || insightObject;
        console.log('✅ AI Insights received:', aiInsights);
        console.log('📋 Conflicts:', aiInsights.conflicts?.length || 0);
        console.log('📋 Recommendations:', aiInsights.recommendations?.length || 0);
        console.log('📋 Recommendations detail:', JSON.stringify(aiInsights.recommendations, null, 2));

        // Transform the response to match the expected format
        const transformedData = {
          status: aiInsights.status || 'safe',
          healthScore: aiInsights.healthScore || 7,
          conflicts: aiInsights.conflicts || [],
          dailyTotals: aiInsights.dailyTotals || {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sodium: 0,
            sugar: 0
          },
          recommendations: aiInsights.recommendations || [],
          nutritionSummary: aiInsights.nutritionSummary || 'AI analysis completed',
          weeklySummary: aiInsights.weeklySummary || null,
          aiGenerated: aiInsights.aiGenerated || false,
          safetyMessage: aiInsights.safetyMessage || 'No safety concerns identified'
        };

        return transformedData;

      } catch (err) {
        console.error('❌ Error fetching AI insights:', err);

        // Return null so the component knows to fetch on-demand
        return null;
      }
    },
    enabled: !!profileId && profileId !== "default",
    staleTime: Infinity, // Never consider data stale
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    retry: false, // Don't auto-retry - user can manually retry with button
  });

  return {
    insights,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load insights') : null
  };
};

// Helper functions - implement these based on your actual data structure
async function getUserFoodData(profileId: string, date: string): Promise<any[]> {
  try {
    // Try multiple possible endpoints for food data
    const endpoints = [
      `/api/food-entries/${profileId}?date=${date}`,
      `/api/food-entries/${profileId}`,
      `/api/food-diary/${profileId}/${date}`,
      `/api/food-diary/${profileId}?date=${date}`
    ];
    
    let foodData = [];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🍎 Trying food data endpoint: ${endpoint}`);
        const response = await fetch(endpoint);
        
        if (response.ok) {
          const result = await response.json();
          // Handle new response format: {success: true, data: FoodEntry[]}
          const data = result.data || result;
          // Handle different response structures
          if (Array.isArray(data)) {
            foodData = data;
          } else if (data.entries && Array.isArray(data.entries)) {
            foodData = data.entries;
          } else if (data.foods && Array.isArray(data.foods)) {
            foodData = data.foods;
          } else {
            foodData = [];
          }
          console.log(`✅ Food data found at ${endpoint}:`, foodData);
          break;
        }
        
      } catch (endpointError) {
        console.log(`❌ Endpoint ${endpoint} failed:`, endpointError);
        continue;
      }
    }
    
    // Transform food data to expected format
    return foodData.map((entry: any) => ({
      id: entry.id,
      name: entry.foodName || entry.name,
      portion: entry.servingSize || 1,
      unit: entry.servingUnit || 'piece',
      mealType: entry.mealType || 'snack',
      nutrition: {
        calories: entry.nutritionData?.calories || entry.calories || 0,
        protein: entry.nutritionData?.protein || entry.protein || 0,
        carbs: entry.nutritionData?.carbs || entry.carbs || 0,
        fat: entry.nutritionData?.fat || entry.fat || 0,
        fiber: entry.nutritionData?.fiber || entry.fiber || 0,
        sodium: entry.nutritionData?.sodium || entry.sodium || 0,
        sugar: entry.nutritionData?.sugar || entry.sugar || 0,
        vitamins: entry.nutritionData?.vitamins || {},
        minerals: entry.nutritionData?.minerals || {}
      },
      ingredients: entry.ingredients || [],
      timestamp: entry.createdAt || entry.timestamp
    }));
    
  } catch (error) {
    console.warn('🚫 Could not fetch food data, using empty array:', error);
    return [];
  }
}

async function getUserHealthProfile(profileId: string): Promise<any> {
  try {
    // Try multiple possible endpoints for health profile
    const endpoints = [
      `/api/health-profile/${profileId}`,
      `/api/profile/${profileId}`,
      `/api/user/${profileId}/health`
    ];
    
    let profileData = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🏥 Trying health profile endpoint: ${endpoint}`);
        const response = await fetch(endpoint);
        
        if (response.ok) {
          const result = await response.json();
          // Handle new response format: {success: true, data: HealthProfile}
          profileData = result.data || result;
          console.log(`✅ Health profile found at ${endpoint}:`, profileData);
          break;
        }
      } catch (endpointError) {
        console.log(`❌ Endpoint ${endpoint} failed:`, endpointError);
        continue;
      }
    }
    
    // Transform and return health profile data
    if (profileData) {
      return {
        age: calculateAge(profileData.birthYear, profileData.birthMonth) || profileData.age,
        gender: profileData.gender || 'not specified',
        weight: profileData.weight,
        height: profileData.height,
        activityLevel: profileData.activityLevel || 'moderate',
        conditions: profileData.medicalConditions || [],
        medications: profileData.medications || [],
        goals: profileData.healthGoals || profileData.goals || ['general wellness'],
        allergies: profileData.allergies || []
      };
    }
    
    // If no profile found, return defaults
    throw new Error('No health profile found');
    
  } catch (error) {
    console.warn('🚫 Could not fetch health profile, using defaults:', error);
    return {
      age: 30,
      gender: 'not specified',
      weight: 70,
      height: 170,
      activityLevel: 'moderate',
      conditions: [],
      medications: [],
      goals: ['general wellness'],
      allergies: []
    };
  }
}

// Helper function to calculate age from birth year and month
function calculateAge(birthYear?: number, birthMonth?: number): number | undefined {
  if (!birthYear) return undefined;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
  
  let age = currentYear - birthYear;
  
  // Adjust if birthday hasn't occurred this year
  if (birthMonth && currentMonth < birthMonth) {
    age--;
  }
  
  return age;
}

// Export helper functions for testing
export { getUserFoodData, getUserHealthProfile };