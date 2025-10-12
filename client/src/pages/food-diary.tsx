import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Search, Utensils, Info, Trash2, ChevronDown, ChevronUp, Brain, AlertCircle } from "lucide-react";
import { useFoodDiary } from "@/hooks/use-food-diary";
import { useToast } from "@/hooks/use-toast";
import NutrientInfoModal from "@/components/modals/nutrient-info-modal";
import { formatNumber, formatWithUnit } from "@/lib/format-number";
import { TranslatedFood } from '@/components/TranslatedFood';


import { nutrientData, type NutrientDataByLanguage } from '@/data/nutrients-translated';
import { useLanguage } from '@/contexts/language-context';

// // In your food diary




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

// function FoodDiary() {
//   const { t } = useLanguage();
  
//   return (
//     <div>
//       {/* Use t() for known keys */}
//       <h1>{t('todaysNutrition')}</h1>
      
//       {/* Use AutoTranslate for unknown text */}
//       <button><AutoTranslate>Add Food Item</AutoTranslate></button>
      
//       {/* For dynamic food names */}
//       <span><DynamicText category="food">{foodItem.name}</DynamicText></span>
      
//       {/* For units */}
//       <span><DynamicText category="unit">piece</DynamicText></span>
//     </div>
//   );
// }

export default function FoodDiary() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const { foodEntries, addFoodEntry, deleteFoodEntry, searchFood, getNutrition, isLoading } = useFoodDiary();
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showNutrientModal, setShowNutrientModal] = useState(false);
  const [selectedNutrient, setSelectedNutrient] = useState("");
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [collapsedMeals, setCollapsedMeals] = useState<Set<string>>(new Set());

  const translateNutrient = (nutrientName: string) => {
    // First map the nutrient key to the proper display name
    const nameMap: { [key: string]: string } = {
      // Macronutrients
      'calories': 'Calories',
      'protein': 'Protein',
      'carbs': 'Carbohydrates',
      'carbohydrates': 'Carbohydrates',
      'fat': 'Fat',
      'fiber': 'Fiber',
      'sugar': 'Sugar',
      'sodium': 'Sodium',

      // Vitamins
      'vitamin c': 'Vitamin C',
      'vitamin a': 'Vitamin A',
      'vitamin e': 'Vitamin E',
      'vitamin k': 'Vitamin K',
      'vitamin b1': 'Thiamine',
      'vitamin b2': 'Riboflavin',
      'vitamin b3': 'Vitamin B3',
      'vitamin b6': 'Vitamin B6',
      'folate': 'Folate',
      'vitamin b12': 'Vitamin B12',
      'vitamin d': 'Vitamin D',

      // Minerals
      'calcium': 'Calcium',
      'iron': 'Iron',
      'magnesium': 'Magnesium',
      'phosphorus': 'Phosphorus',
      'potassium': 'Potassium',
      'zinc': 'Zinc',
      'copper': 'Copper',
      'manganese': 'Manganese',
      'selenium': 'Selenium',

      // Others
      'alcohol': 'Alcohol',
      'caffeine': 'Caffeine'
    };

    const mappedName = nameMap[nutrientName.toLowerCase()] || nutrientName;
    const currentLang = language as keyof typeof nutrientData;
    return (nutrientData[currentLang] as NutrientDataByLanguage)?.[mappedName]?.name || mappedName;
  };

  const translateFood = (foodName: string) => {
    const currentLang = language as keyof typeof nutrientData;
    return (nutrientData[currentLang] as NutrientDataByLanguage)?.[foodName]?.name || foodName;
  };

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
        title: t('foodDeleted'),
        description: `${foodName} ${t('foodDeletedDesc')}`,
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failedToDeleteFood'),
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: FoodEntryForm) => {
    if (!selectedFood) {
      toast({
        title: t('noFoodSelected'),
        description: t('selectFoodFirst'),
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
        // Include alcohol and caffeine if present
        // Note: alcohol is percentage by volume, so don't scale it
        alcohol: baseNutrition.alcohol ? parseFloat(formatNumber(baseNutrition.alcohol)) : undefined,
        caffeine: baseNutrition.caffeine ? parseFloat(formatNumber(baseNutrition.caffeine * scalingFactor, 0)) : undefined,
        bioactive: baseNutrition.bioactive || undefined,
      };
      

// Translate food name if needed
      let foodNameToSave = selectedFood.name;

      // Check if the name is already in Chinese (contains Chinese characters)
      const isChinese = /[\u4e00-\u9fff]/.test(selectedFood.name);

      if (language === 'zh') {
        // If we're in Chinese mode and name has Chinese name property, use it
        if ((selectedFood as any).chineseName) {
          foodNameToSave = (selectedFood as any).chineseName;
        }
        // If name is already in Chinese, keep it as is (DON'T translate)
        else if (isChinese) {
          foodNameToSave = selectedFood.name;
        }
        // Only translate if it's English text
        else {
          try {
            const response = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: selectedFood.name,
                targetLang: 'zh-CN'
              })
            });
            const translationData = await response.json();
            foodNameToSave = translationData.translatedText || selectedFood.name;
          } catch (error) {
            console.error('Translation failed:', error);
          }
        }
      } else {
        // English mode - check if name is Chinese and needs translation
        if (isChinese) {
          try {
            const response = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: selectedFood.name,
                targetLang: 'en'
              })
            });
            const translationData = await response.json();
            foodNameToSave = translationData.translatedText || selectedFood.name;
          } catch (error) {
            console.error('Translation failed:', error);
            foodNameToSave = selectedFood.name;
          }
        } else {
          // Already in English, use as is
          foodNameToSave = selectedFood.name;
        }
      }


      await addFoodEntry({
        foodName: foodNameToSave,
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
        description: t('failedToAddFood'),
        variant: "destructive",
      });
    }
  };

  const handleNutrientInfo = (nutrientName: string) => {
    setSelectedNutrient(nutrientName);
    setShowNutrientModal(true);
  };

  const toggleExpanded = (entryId: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const toggleMealCollapse = (mealType: string) => {
    setCollapsedMeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mealType)) {
        newSet.delete(mealType);
      } else {
        newSet.add(mealType);
      }
      return newSet;
    });
  };

  // Handler for analyzing health insights
  const handleAnalyzeHealth = () => {
    if (foodEntries.length === 0) {
      toast({
        title: language === 'zh' ? '请先添加食物记录' : 'Please add food entries first',
        description: language === 'zh'
          ? '您需要先添加今天的饮食记录才能查看健康分析'
          : 'You need to add your food entries before viewing health insights',
        variant: 'destructive',
      });
      return;
    }
    setLocation('/insights');
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
      calories: parseFloat(formatNumber(rawTotals.calories)),
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
            <div className="text-2xl font-bold" data-testid="daily-calories">{formatNumber(dailyTotals.calories, 0)}{t('cal')}</div>
            <div className="text-blue-100 text-sm">{t('calories')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" data-testid="daily-protein">{formatWithUnit(dailyTotals.protein, t('g'))}</div>
            <div className="text-blue-100 text-sm">{t('protein')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" data-testid="daily-carbs">{formatWithUnit(dailyTotals.carbs, t('g'))}</div>
            <div className="text-blue-100 text-sm">{t('carbs')}</div>
          </div>
        </div>
      </div>

      {/* Analyze Health Button */}
      <div className="px-4">
        <Button
          onClick={handleAnalyzeHealth}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-6 rounded-xl shadow-lg flex items-center justify-center gap-2"
        >
          <Brain className="w-5 h-5" />
          <span className="text-base">
            {language === 'zh' ? '分析您的饮食健康' : 'Analyze Your Dietary Health'}
          </span>
        </Button>
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
                    placeholder={t('searchFoodPlaceholder')}
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
                <div className="flex items-center gap-3">
                  <div className="text-base font-bold text-gray-700" data-testid={`${mealType}-calories`}>
                    {Math.round(entries.reduce((sum, entry) => sum + ((entry.nutritionData as any).calories || 0), 0))} {t('cal')}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 p-1 h-auto"
                    onClick={() => toggleMealCollapse(mealType)}
                  >
                    {collapsedMeals.has(mealType) ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronUp className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Food Items */}
              {!collapsedMeals.has(mealType) && (
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

                  // Add alcohol if present
                  if (nutrition.alcohol && typeof nutrition.alcohol === 'number' && nutrition.alcohol > 0) {
                    micronutrients.push({
                      name: 'Alcohol',
                      value: nutrition.alcohol,
                      type: 'alcohol',
                      unit: '% vol'
                    });
                  }

                  // Add caffeine if present
                  if (nutrition.caffeine && typeof nutrition.caffeine === 'number' && nutrition.caffeine > 0) {
                    micronutrients.push({
                      name: 'Caffeine',
                      value: nutrition.caffeine,
                      type: 'caffeine',
                      unit: 'mg'
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
                            <div className="font-medium text-gray-900"><TranslatedFood>{entry.foodName}</TranslatedFood></div>
                            <div className="text-sm text-gray-500">{entry.servingSize} {t(entry.servingUnit)}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div className="font-medium text-gray-900">{Math.round(nutrition.calories || 0)} {t('cal')}</div>
                            <div className="text-xs text-gray-500">{formatWithUnit(nutrition.protein, t('g'))} {t('protein')}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 h-8 w-8"
                            onClick={() => {
                              console.log('Delete clicked for entry:', entry);
                              if (entry.id) {
                                handleDeleteEntry(entry.id, entry.foodName);
                              } else {
                                console.error('Entry ID is missing:', entry);
                              }
                            }}
                            title="Delete this food entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Micronutrients Section */}
                      {micronutrients.length > 0 && (
                        <div className="border-t border-gray-200 pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-gray-700">{t('micronutrients')}</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary-custom px-2 py-1 h-auto flex items-center gap-1"
                              onClick={() => toggleExpanded(entry.id)}
                            >
                              <span className="text-xs">{expandedEntries.has(entry.id) ? t('collapse') : t('expand')}</span>
                              {expandedEntries.has(entry.id) ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                          {expandedEntries.has(entry.id) && (
                            <div className="grid grid-cols-2 gap-2">
                              {micronutrients.sort((a, b) => b.value - a.value).map((nutrient, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border">
                                  <div className="text-xs">
                                    <div className="font-medium text-gray-800">{translateNutrient(nutrient.name)}</div>
                                    <div className="text-gray-600">{formatWithUnit(nutrient.value, nutrient.unit || (language === 'zh' ? '毫克' : 'mg'))}</div>
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
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              )}

              {/* Macro Breakdown */}
              {entries.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-sm text-gray-600">{t('carbs')}</div>
                      <div className="font-semibold text-blue-700">
                        {formatWithUnit(entries.reduce((sum, entry) => sum + ((entry.nutritionData as any).carbs || 0), 0), t('g'))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">{t('protein')}</div>
                      <div className="font-semibold text-green-700">
                        {formatWithUnit(entries.reduce((sum, entry) => sum + ((entry.nutritionData as any).protein || 0), 0), t('g'))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">{t('fat')}</div>
                      <div className="font-semibold text-orange-700">
                        {formatWithUnit(entries.reduce((sum, entry) => sum + ((entry.nutritionData as any).fat || 0), 0), t('g'))}
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noFoodEntries')}</h3>
              <p className="text-gray-500">{t('startTrackingNutrition')}</p>
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
