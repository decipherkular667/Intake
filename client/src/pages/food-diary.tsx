import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Search, Utensils, Info, Trash2 } from "lucide-react";
import { useFoodDiary } from "@/hooks/use-food-diary";
import { useToast } from "@/hooks/use-toast";
import NutrientInfoModal from "@/components/modals/nutrient-info-modal";
import { formatNumber, formatWithUnit } from "@/lib/format-number";
import { useLanguage } from "@/contexts/language-context";

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
  const { t, language } = useLanguage();
  const { foodEntries, addFoodEntry, deleteFoodEntry, searchFood, getNutrition, isLoading } = useFoodDiary();
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

  // Real-time search as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchFood(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchFood]);

  const handleSelectFood = (food: FoodSearchResult) => {
    setSelectedFood(food);
    form.setValue("foodName", food.name);
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleDeleteEntry = async (entryId: string, foodName: string) => {
    try {
      await deleteFoodEntry(entryId);
      toast({
        title: "Food Deleted",
        description: `${foodName} has been removed from your diary.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete food entry. Please try again.",
        variant: "destructive",
      });
    }
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
      
      // Calculate nutrition for serving size with proper scaling
      const baseNutrition = nutritionData.nutrition;
      
      // Determine scaling factor based on serving unit
      let scalingFactor = data.servingSize;
      if (data.servingUnit === "gram") {
        // Base nutrition is typically per 100g for most foods
        // Adjust to per gram basis
        scalingFactor = data.servingSize / 100;
      } else if (data.servingUnit === "piece") {
        // Base nutrition is per piece, so direct multiplication
        scalingFactor = data.servingSize;
      } else if (data.servingUnit === "cup") {
        // Base nutrition is typically per 100g, cup is ~240g
        scalingFactor = (data.servingSize * 240) / 100;
      } else if (data.servingUnit === "ounce") {
        // Base nutrition per 100g, ounce is ~28g  
        scalingFactor = (data.servingSize * 28) / 100;
      } else if (data.servingUnit === "tablespoon") {
        // Base nutrition per 100g, tablespoon is ~15g
        scalingFactor = (data.servingSize * 15) / 100;
      } else if (data.servingUnit === "teaspoon") {
        // Base nutrition per 100g, teaspoon is ~5g
        scalingFactor = (data.servingSize * 5) / 100;
      }
      
      // Scale nutrition values and format them properly to avoid floating point precision issues
      const scaledNutrition = {
        calories: parseFloat(formatNumber(baseNutrition.calories * scalingFactor, 0)),
        protein: parseFloat(formatNumber(baseNutrition.protein * scalingFactor)),
        carbs: parseFloat(formatNumber(baseNutrition.carbs * scalingFactor)),
        fat: parseFloat(formatNumber(baseNutrition.fat * scalingFactor)),
        fiber: parseFloat(formatNumber((baseNutrition.fiber || 0) * scalingFactor)),
        sugar: parseFloat(formatNumber((baseNutrition.sugar || 0) * scalingFactor)),
        sodium: parseFloat(formatNumber((baseNutrition.sodium || 0) * scalingFactor, 0)),
        // Include and scale vitamins correctly
        vitamins: baseNutrition.vitamins ? Object.fromEntries(
          Object.entries(baseNutrition.vitamins).map(([key, value]) => [
            key, 
            typeof value === 'number' ? parseFloat(formatNumber(value * scalingFactor)) : value
          ])
        ) : {},
        // Include and scale minerals correctly
        minerals: baseNutrition.minerals ? Object.fromEntries(
          Object.entries(baseNutrition.minerals).map(([key, value]) => [
            key, 
            typeof value === 'number' ? parseFloat(formatNumber(value * scalingFactor)) : value
          ])
        ) : {},
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
        title: t('foodAdded'),
        description: `${data.foodName} ${t('foodAddedDesc')}`,
      });

      // Reset form
      form.reset();
      setSelectedFood(null);
    } catch (error) {
      toast({
        title: t('error'),
        description: "Failed to add food entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNutrientInfo = (nutrientName: string) => {
    setSelectedNutrient(nutrientName);
    setShowNutrientModal(true);
  };

  // Calculate daily totals - fix floating point precision issues
  const dailyTotals = (() => {
    let rawTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    for (const entry of foodEntries) {
      const nutrition = entry.nutritionData as any;
      rawTotals.calories += nutrition.calories || 0;
      rawTotals.protein += nutrition.protein || 0;
      rawTotals.carbs += nutrition.carbs || 0;
      rawTotals.fat += nutrition.fat || 0;
    }
    
    // Apply formatting to final totals
    return {
      calories: parseFloat(formatNumber(rawTotals.calories, 0)),
      protein: parseFloat(formatNumber(rawTotals.protein)),
      carbs: parseFloat(formatNumber(rawTotals.carbs)),
      fat: parseFloat(formatNumber(rawTotals.fat)),
    };
  })();

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
        <h2 className="text-xl font-semibold mb-2">{t('todaysNutrition')}</h2>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold" data-testid="daily-calories">{formatNumber(dailyTotals.calories, 0)}</div>
            <div className="text-blue-100 text-sm">{t('calories')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" data-testid="daily-protein">{formatWithUnit(dailyTotals.protein, 'g')}</div>
            <div className="text-blue-100 text-sm">{t('protein')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" data-testid="daily-carbs">{formatWithUnit(dailyTotals.carbs, 'g')}</div>
            <div className="text-blue-100 text-sm">{t('carbs')}</div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Add Food Section */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <PlusCircle className="text-primary-custom mr-2" />
              {t('addFoodItem')}
            </h3>
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>{t('searchFood')}</Label>
                <div className="relative mt-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === 'zh' ? "输入食物名称 (例如：香蕉、鸡胸肉)" : "Type food item (e.g., banana, chicken breast)"}
                    className="pr-12"
                    onKeyPress={(e) => e.key === "Enter" && e.preventDefault()}
                    data-testid="input-food-search"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-primary-custom"
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
                        <div className="font-medium">
                          {(food as any).chineseName && /[\u4e00-\u9fff]/.test(searchQuery) 
                            ? (food as any).chineseName 
                            : food.name}
                        </div>
                        {food.brand && <div className="text-sm text-gray-500">{food.brand}</div>}
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Food Preview */}
                {selectedFood && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-green-800">{t('selected')}</span>
                      <span className="text-green-700">
                        {(selectedFood as any).chineseName && /[\u4e00-\u9fff]/.test(searchQuery) 
                          ? (selectedFood as any).chineseName 
                          : selectedFood.name}
                      </span>
                      {selectedFood.brand && (
                        <span className="text-green-600 text-sm">({selectedFood.brand})</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>{t('servingSize')}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    {...form.register("servingSize", { valueAsNumber: true })}
                    className="mt-2"
                    data-testid="input-serving-size"
                  />
                </div>
                <div>
                  <Label>{t('unit')}</Label>
                  <Select
                    value={form.watch("servingUnit")}
                    onValueChange={(value) => form.setValue("servingUnit", value)}
                  >
                    <SelectTrigger className="mt-2" data-testid="select-serving-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="piece">{t('piece')}</SelectItem>
                      <SelectItem value="cup">{t('cup')}</SelectItem>
                      <SelectItem value="ounce">{t('ounce')}</SelectItem>
                      <SelectItem value="tablespoon">{t('tablespoon')}</SelectItem>
                      <SelectItem value="teaspoon">{t('teaspoon')}</SelectItem>
                      <SelectItem value="gram">{t('gram')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('meal')}</Label>
                  <Select
                    value={form.watch("mealType")}
                    onValueChange={(value) => form.setValue("mealType", value)}
                  >
                    <SelectTrigger className="mt-2" data-testid="select-meal-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">{t('breakfast')}</SelectItem>
                      <SelectItem value="lunch">{t('lunch')}</SelectItem>
                      <SelectItem value="dinner">{t('dinner')}</SelectItem>
                      <SelectItem value="snack">{t('snack')}</SelectItem>
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
{isLoading ? t('loading') : t('addToDiary')}
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
                  <span className="capitalize">{t(mealType) || mealType}</span>
                </h3>
                <div className="text-sm text-gray-500" data-testid={`${mealType}-calories`}>
                  {Math.round(entries.reduce((sum, entry) => sum + ((entry.nutritionData as any).calories || 0), 0))} {t('cal')}
                </div>
              </div>
              
              {/* Food Items */}
              <div className="space-y-3">
                {entries.map((entry, index) => {
                  const nutrition = entry.nutritionData as any;
                  
                  // Extract micronutrients
                  const micronutrients = [];
                  if (nutrition.vitamins) {
                    Object.entries(nutrition.vitamins).forEach(([key, value]) => {
                      if (value && typeof value === 'number' && value > 0) {
                        micronutrients.push({
                          name: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                          value: value as number,
                          type: 'vitamin'
                        });
                      }
                    });
                  }
                  if (nutrition.minerals) {
                    Object.entries(nutrition.minerals).forEach(([key, value]) => {
                      if (value && typeof value === 'number' && value > 0) {
                        micronutrients.push({
                          name: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                          value: value as number,
                          type: 'mineral'
                        });
                      }
                    });
                  }
                  
                  return (
                    <div key={entry.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
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
                            <div className="text-xs text-gray-500">{formatWithUnit(nutrition.protein, 'g')} protein</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 h-8 w-8"
                            onClick={() => handleDeleteEntry(entry.id!, entry.foodName)}
                            title="Delete this food entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Micronutrients Section */}
                      {micronutrients.length > 0 && (
                        <div className="border-t border-gray-200 pt-3">
                          <div className="text-sm font-medium text-gray-700 mb-2">Micronutrients</div>
                          <div className="grid grid-cols-2 gap-2">
                            {micronutrients.map((nutrient, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border">
                                <div className="text-xs">
                                  <div className="font-medium text-gray-800">{nutrient.name}</div>
                                  <div className="text-gray-600">{formatWithUnit(nutrient.value, 'mg')}</div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary-custom p-1 h-6 w-6"
                                  onClick={() => handleNutrientInfo(nutrient.name)}
                                  data-testid={`nutrient-info-${entry.id}-${nutrient.name.toLowerCase()}`}
                                >
                                  <Info className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
                        {formatWithUnit(entries.reduce((sum, entry) => sum + ((entry.nutritionData as any).carbs || 0), 0), 'g')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Protein</div>
                      <div className="font-semibold text-green-700">
                        {formatWithUnit(entries.reduce((sum, entry) => sum + ((entry.nutritionData as any).protein || 0), 0), 'g')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Fat</div>
                      <div className="font-semibold text-orange-700">
                        {formatWithUnit(entries.reduce((sum, entry) => sum + ((entry.nutritionData as any).fat || 0), 0), 'g')}
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
