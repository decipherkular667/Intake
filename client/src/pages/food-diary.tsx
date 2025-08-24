import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Search, Utensils, Info } from "lucide-react";
import { useFoodDiary } from "@/hooks/use-food-diary";
import { useToast } from "@/hooks/use-toast";
import NutrientInfoModal from "@/components/modals/nutrient-info-modal";

type FoodSearchResult = {
  id: string;
  name: string;
  brand?: string;
  nutrients?: Record<string, number>;
};

type FoodEntryForm = {
  foodName: string;
  servingSize: number;
  servingUnit: string;
  mealType: string;
};

export default function FoodDiary() {
  const { toast } = useToast();
  const { foodEntries, addFoodEntry, searchFood, getNutrition, isLoading } = useFoodDiary();
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showNutrientModal, setShowNutrientModal] = useState(false);
  const [selectedNutrient, setSelectedNutrient] = useState("");

  const form = useForm<FoodEntryForm>({
    defaultValues: {
      foodName: "",
      servingSize: 1,
      servingUnit: "piece",
      mealType: "breakfast",
    },
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchFood(searchQuery);
      setSearchResults(results);
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Unable to search for foods. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectFood = (food: FoodSearchResult) => {
    setSelectedFood(food);
    form.setValue("foodName", food.name);
    setSearchResults([]);
    setSearchQuery("");
  };

  const onSubmit = async (data: FoodEntryForm) => {
    if (!selectedFood) {
      toast({
        title: "No Food Selected",
        description: "Please search and select a food item first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get nutrition data
      const nutritionData = await getNutrition(selectedFood.id);
      
      // Calculate nutrition for serving size
      const baseNutrition = nutritionData.nutrition;
      const scaledNutrition = {
        calories: baseNutrition.calories * data.servingSize,
        protein: baseNutrition.protein * data.servingSize,
        carbs: baseNutrition.carbs * data.servingSize,
        fat: baseNutrition.fat * data.servingSize,
        fiber: (baseNutrition.fiber || 0) * data.servingSize,
        sugar: (baseNutrition.sugar || 0) * data.servingSize,
        sodium: (baseNutrition.sodium || 0) * data.servingSize,
      };

      await addFoodEntry({
        profileId: "default", // In a real app, this would come from auth
        foodName: data.foodName,
        servingSize: data.servingSize,
        servingUnit: data.servingUnit,
        mealType: data.mealType,
        nutritionData: scaledNutrition,
        entryDate: new Date().toISOString().split('T')[0],
      });

      toast({
        title: "Food Added",
        description: `${data.foodName} has been added to your diary.`,
      });

      // Reset form
      form.reset();
      setSelectedFood(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add food entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNutrientInfo = (nutrientName: string) => {
    setSelectedNutrient(nutrientName);
    setShowNutrientModal(true);
  };

  // Calculate daily totals
  const dailyTotals = foodEntries.reduce((totals, entry) => {
    const nutrition = entry.nutritionData as any;
    return {
      calories: totals.calories + (nutrition.calories || 0),
      protein: totals.protein + (nutrition.protein || 0),
      carbs: totals.carbs + (nutrition.carbs || 0),
      fat: totals.fat + (nutrition.fat || 0),
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Group entries by meal type
  const mealGroups = foodEntries.reduce((groups, entry) => {
    const mealType = entry.mealType;
    if (!groups[mealType]) {
      groups[mealType] = [];
    }
    groups[mealType].push(entry);
    return groups;
  }, {} as Record<string, typeof foodEntries>);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="bg-gradient-to-r from-secondary-custom to-blue-600 text-white p-6 mx-4 mt-4 rounded-xl">
        <h2 className="text-xl font-semibold mb-2">Today's Nutrition</h2>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold" data-testid="daily-calories">{Math.round(dailyTotals.calories)}</div>
            <div className="text-blue-100 text-sm">Calories</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" data-testid="daily-protein">{Math.round(dailyTotals.protein)}g</div>
            <div className="text-blue-100 text-sm">Protein</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" data-testid="daily-carbs">{Math.round(dailyTotals.carbs)}g</div>
            <div className="text-blue-100 text-sm">Carbs</div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Add Food Section */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <PlusCircle className="text-primary-custom mr-2" />
              Add Food Item
            </h3>
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>Search Food</Label>
                <div className="relative mt-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type food item (e.g., banana, chicken breast)"
                    className="pr-12"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
                    data-testid="input-food-search"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-primary-custom"
                    onClick={handleSearch}
                    disabled={isSearching}
                    data-testid="button-search-food"
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                </div>
                
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                    {searchResults.map((food) => (
                      <button
                        key={food.id}
                        type="button"
                        className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0"
                        onClick={() => handleSelectFood(food)}
                        data-testid={`food-result-${food.id}`}
                      >
                        <div className="font-medium">{food.name}</div>
                        {food.brand && <div className="text-sm text-gray-500">{food.brand}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Serving Size</Label>
                  <Input
                    type="number"
                    step="0.1"
                    {...form.register("servingSize", { valueAsNumber: true })}
                    className="mt-2"
                    data-testid="input-serving-size"
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Select
                    value={form.watch("servingUnit")}
                    onValueChange={(value) => form.setValue("servingUnit", value)}
                  >
                    <SelectTrigger className="mt-2" data-testid="select-serving-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="piece">piece</SelectItem>
                      <SelectItem value="cup">cup</SelectItem>
                      <SelectItem value="gram">gram</SelectItem>
                      <SelectItem value="ounce">ounce</SelectItem>
                      <SelectItem value="tablespoon">tablespoon</SelectItem>
                      <SelectItem value="teaspoon">teaspoon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Meal</Label>
                  <Select
                    value={form.watch("mealType")}
                    onValueChange={(value) => form.setValue("mealType", value)}
                  >
                    <SelectTrigger className="mt-2" data-testid="select-meal-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary-custom text-white hover:bg-green-700"
                disabled={!selectedFood || isLoading}
                data-testid="button-add-food"
              >
                {isLoading ? "Adding..." : "Add to Diary"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Today's Meals */}
        {Object.entries(mealGroups).map(([mealType, entries]) => (
          <Card key={mealType}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Utensils className="text-orange-500 mr-2" />
                  <span className="capitalize">{mealType}</span>
                </h3>
                <div className="text-sm text-gray-500" data-testid={`${mealType}-calories`}>
                  {Math.round(entries.reduce((sum, entry) => sum + ((entry.nutritionData as any).calories || 0), 0))} cal
                </div>
              </div>
              
              {/* Food Items */}
              <div className="space-y-3">
                {entries.map((entry, index) => {
                  const nutrition = entry.nutritionData as any;
                  return (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                          <Utensils className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{entry.foodName}</div>
                          <div className="text-sm text-gray-500">{entry.servingSize} {entry.servingUnit}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="font-medium text-gray-900">{Math.round(nutrition.calories || 0)} cal</div>
                          <div className="text-xs text-gray-500">{Math.round(nutrition.protein || 0)}g protein</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary-custom p-1"
                          onClick={() => handleNutrientInfo("calories")}
                          data-testid={`nutrient-info-${entry.id}`}
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Macro Breakdown */}
              {entries.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-sm text-gray-600">Carbs</div>
                      <div className="font-semibold text-blue-700">
                        {Math.round(entries.reduce((sum, entry) => sum + ((entry.nutritionData as any).carbs || 0), 0))}g
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Protein</div>
                      <div className="font-semibold text-green-700">
                        {Math.round(entries.reduce((sum, entry) => sum + ((entry.nutritionData as any).protein || 0), 0))}g
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Fat</div>
                      <div className="font-semibold text-orange-700">
                        {Math.round(entries.reduce((sum, entry) => sum + ((entry.nutritionData as any).fat || 0), 0))}g
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Empty State */}
        {foodEntries.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Utensils className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No food entries yet</h3>
              <p className="text-gray-500">Start tracking your nutrition by adding your first meal above.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <NutrientInfoModal
        open={showNutrientModal}
        onOpenChange={setShowNutrientModal}
        nutrientName={selectedNutrient}
      />
    </div>
  );
}
