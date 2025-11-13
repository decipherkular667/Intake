import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Utensils, Globe, Coffee, Sun, Moon, Sparkles, ChefHat } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useHealthProfile } from "@/hooks/use-health-profile";
import { useInsights } from "@/hooks/use-insights";
import { useAuth } from "@/hooks/use-auth";

// Component that translates using direct API calls
const TranslatedText = ({ children }: { children: string }) => {
  const [translatedText, setTranslatedText] = useState(children);
  const { language } = useLanguage();

  useEffect(() => {
    let cancelled = false;

    if (language === 'zh' && children) {
      fetch('/api/translate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: [children],
          targetLanguage: 'zh'
        }),
        credentials: 'include'
      })
        .then(res => res.json())
        .then(data => {
          if (!cancelled && data.translations && data.translations[0]) {
            setTranslatedText(data.translations[0]);
          } else {
            setTranslatedText(children);
          }
        })
        .catch(error => {
          console.error('Translation error:', error);
          if (!cancelled) {
            setTranslatedText(children);
          }
        });
    } else {
      setTranslatedText(children);
    }

    return () => {
      cancelled = true;
    };
  }, [children, language]);

  return <>{translatedText || children}</>;
};

type CuisineStyle = 'chinese' | 'western' | 'japanese' | 'mediterranean' | 'all';
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface FoodRecommendation {
  id: string;
  name: string;
  nameChinese: string;
  category: string;
  categoryChinese: string;
  scientificAmount: number; // in grams
  practicalAmount: string; // e.g., "1 small bowl", "half cup"
  practicalAmountChinese: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  reason: string;
  reasonChinese: string;
  cuisineStyle: CuisineStyle[];
  mealTypes: MealType[];
}

export default function FoodRecommendations() {
  const { language } = useLanguage();
  const { profile } = useHealthProfile();
  const { insights } = useInsights();
  const { user } = useAuth();

  const [selectedCuisine, setSelectedCuisine] = useState<CuisineStyle>('all');
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [isGenerating, setIsGenerating] = useState(false);

  const t = (key: string) => {
    const translations: Record<string, { en: string; zh: string }> = {
      pageTitle: { en: 'Food Recommendations', zh: '食物推荐' },
      pageDescription: { en: 'Personalized meal suggestions based on your health profile and dietary history', zh: '基于您的健康档案和饮食历史的个性化膳食建议' },
      cuisineStyle: { en: 'Cuisine Style', zh: '菜系风格' },
      mealType: { en: 'Meal Type', zh: '餐别' },
      all: { en: 'All Cuisines', zh: '所有菜系' },
      chinese: { en: 'Chinese', zh: '中餐' },
      western: { en: 'Western', zh: '西餐' },
      japanese: { en: 'Japanese', zh: '日餐' },
      mediterranean: { en: 'Mediterranean', zh: '地中海' },
      breakfast: { en: 'Breakfast', zh: '早餐' },
      lunch: { en: 'Lunch', zh: '午餐' },
      dinner: { en: 'Dinner', zh: '晚餐' },
      snack: { en: 'Snack', zh: '小吃' },
      generateRecommendations: { en: 'Generate', zh: '生成推荐' },
      servingSize: { en: 'Serving Size', zh: '分量' },
      nutrition: { en: 'Nutrition', zh: '营养成分' },
      whyThisFood: { en: 'Why This Food', zh: '推荐理由' },
      calories: { en: 'Calories', zh: '热量' },
      protein: { en: 'Protein', zh: '蛋白质' },
      carbs: { en: 'Carbs', zh: '碳水化合物' },
      fat: { en: 'Fat', zh: '脂肪' },
      fiber: { en: 'Fiber', zh: '膳食纤维' },
      grams: { en: 'g', zh: '克' },
      kcal: { en: 'kcal', zh: '千卡' },
      noRecommendations: { en: 'Click "Generate Recommendations" to get personalized food suggestions', zh: '点击"生成推荐"获取个性化食物建议' },
      basedOnProfile: { en: 'Based on your health profile and recent dietary patterns', zh: '基于您的健康档案和近期饮食模式' },
    };
    return translations[key]?.[language] || key;
  };

  // Sample recommendations (in production, this would come from an API)
  const sampleRecommendations: FoodRecommendation[] = [
    // Chinese Breakfast
    {
      id: '1',
      name: 'Congee with Century Egg',
      nameChinese: '皮蛋瘦肉粥',
      category: 'Whole Grains',
      scientificAmount: 300,
      practicalAmount: '1 large bowl',
      calories: 220,
      protein: 12,
      carbs: 38,
      fat: 3,
      fiber: 2,
      reason: 'Easy to digest, provides gentle energy, rich in protein from egg and lean pork',
      cuisineStyle: ['chinese', 'all'],
      mealTypes: ['breakfast']
    },
    {
      id: '2',
      name: 'Steamed Buns with Vegetables',
      nameChinese: '菜包子',
      category: 'Whole Grains',
      scientificAmount: 150,
      practicalAmount: '2 medium buns',
      calories: 280,
      protein: 8,
      carbs: 48,
      fat: 5,
      fiber: 4,
      reason: 'Balanced carbs and vegetables, provides sustained morning energy',
      cuisineStyle: ['chinese', 'all'],
      mealTypes: ['breakfast']
    },
    {
      id: '3',
      name: 'Soy Milk with Egg',
      nameChinese: '豆浆加鸡蛋',
      category: 'Protein',
      scientificAmount: 300,
      practicalAmount: '1 cup soy milk + 1 egg (300ml + 50g)',
      calories: 220,
      protein: 18,
      carbs: 12,
      fat: 10,
      fiber: 2,
      reason: 'High protein breakfast, provides essential amino acids and calcium',
      cuisineStyle: ['chinese', 'all'],
      mealTypes: ['breakfast']
    },
    // Western Breakfast
    {
      id: '4',
      name: 'Oatmeal with Berries',
      nameChinese: '燕麦莓果粥',
      category: 'Whole Grains',
      scientificAmount: 250,
      practicalAmount: '1 medium bowl (250g)',
      calories: 300,
      protein: 10,
      carbs: 54,
      fat: 6,
      fiber: 8,
      reason: 'High in fiber and antioxidants, provides sustained energy for the morning',
      cuisineStyle: ['western', 'all'],
      mealTypes: ['breakfast']
    },
    {
      id: '5',
      name: 'Scrambled Eggs with Toast',
      nameChinese: '炒蛋配全麦面包',
      category: 'Protein',
      scientificAmount: 150,
      practicalAmount: '2 eggs + 2 slices toast (100g + 50g)',
      calories: 320,
      protein: 20,
      carbs: 28,
      fat: 14,
      fiber: 3,
      reason: 'Complete protein source with complex carbs for morning energy',
      cuisineStyle: ['western', 'all'],
      mealTypes: ['breakfast']
    },
    // Japanese Breakfast
    {
      id: '6',
      name: 'Miso Soup with Tofu',
      nameChinese: '味噌豆腐汤',
      category: 'Soup',
      scientificAmount: 250,
      practicalAmount: '1 bowl (250ml)',
      calories: 84,
      protein: 8,
      carbs: 6,
      fat: 4,
      fiber: 2,
      reason: 'Probiotic-rich, aids digestion, provides protein and essential minerals',
      cuisineStyle: ['japanese', 'all'],
      mealTypes: ['breakfast', 'lunch', 'dinner']
    },
    {
      id: '7',
      name: 'Grilled Fish with Rice',
      nameChinese: '烤鱼配米饭',
      category: 'Protein',
      scientificAmount: 200,
      practicalAmount: '1 fish fillet + half bowl rice (120g + 80g)',
      calories: 350,
      protein: 28,
      carbs: 40,
      fat: 8,
      fiber: 1,
      reason: 'Omega-3 rich fish provides heart-healthy fats and high-quality protein',
      cuisineStyle: ['japanese', 'all'],
      mealTypes: ['breakfast', 'lunch', 'dinner']
    },
    // Mediterranean Breakfast
    {
      id: '8',
      name: 'Greek Yogurt with Honey and Nuts',
      nameChinese: '希腊酸奶配蜂蜜坚果',
      category: 'Dairy',
      scientificAmount: 200,
      practicalAmount: '1 cup yogurt + 1 tbsp honey + handful nuts (150g + 20g + 30g)',
      calories: 380,
      protein: 18,
      carbs: 35,
      fat: 18,
      fiber: 3,
      reason: 'Probiotic-rich, high protein, healthy fats from nuts support brain function',
      cuisineStyle: ['mediterranean', 'all'],
      mealTypes: ['breakfast', 'snack']
    },
    // Chinese Lunch & Dinner
    {
      id: '9',
      name: 'Steamed Chicken Breast',
      nameChinese: '清蒸鸡胸肉',
      category: 'Lean Protein',
      scientificAmount: 150,
      practicalAmount: 'Palm-sized portion (150g)',
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      fiber: 0,
      reason: 'Excellent protein source, low in fat, supports muscle maintenance',
      cuisineStyle: ['chinese', 'western', 'all'],
      mealTypes: ['lunch', 'dinner']
    },
    {
      id: '10',
      name: 'Stir-Fried Vegetables',
      nameChinese: '炒时蔬',
      category: 'Vegetables',
      scientificAmount: 200,
      practicalAmount: '1 plate (200g)',
      calories: 120,
      protein: 4,
      carbs: 18,
      fat: 4,
      fiber: 6,
      reason: 'Rich in vitamins, minerals, and fiber, supports digestive health',
      cuisineStyle: ['chinese', 'all'],
      mealTypes: ['lunch', 'dinner']
    },
    {
      id: '11',
      name: 'Steamed Fish with Ginger',
      nameChinese: '清蒸姜丝鱼',
      category: 'Protein',
      scientificAmount: 180,
      practicalAmount: '1 medium fish fillet (180g)',
      calories: 200,
      protein: 35,
      carbs: 2,
      fat: 6,
      fiber: 0,
      reason: 'High protein, omega-3 fatty acids support heart and brain health',
      cuisineStyle: ['chinese', 'all'],
      mealTypes: ['lunch', 'dinner']
    },
    {
      id: '12',
      name: 'Brown Rice',
      nameChinese: '糙米饭',
      category: 'Whole Grains',
      scientificAmount: 200,
      practicalAmount: '1 small bowl (200g)',
      calories: 218,
      protein: 4.5,
      carbs: 45.8,
      fat: 1.6,
      fiber: 3.5,
      reason: 'Complex carbohydrates provide lasting energy, rich in B vitamins',
      cuisineStyle: ['chinese', 'japanese', 'all'],
      mealTypes: ['lunch', 'dinner']
    },
    // Western Lunch & Dinner
    {
      id: '13',
      name: 'Grilled Salmon',
      nameChinese: '烤三文鱼',
      category: 'Protein',
      scientificAmount: 150,
      practicalAmount: '1 fillet (150g)',
      calories: 280,
      protein: 28,
      carbs: 0,
      fat: 18,
      fiber: 0,
      reason: 'Rich in omega-3 fatty acids, supports heart health and reduces inflammation',
      cuisineStyle: ['western', 'all'],
      mealTypes: ['lunch', 'dinner']
    },
    {
      id: '14',
      name: 'Quinoa Salad',
      nameChinese: '藜麦沙拉',
      category: 'Whole Grains',
      scientificAmount: 200,
      practicalAmount: '1 bowl (200g)',
      calories: 220,
      protein: 8,
      carbs: 39,
      fat: 3.5,
      fiber: 5,
      reason: 'Complete protein, all 9 essential amino acids, high in fiber',
      cuisineStyle: ['western', 'mediterranean', 'all'],
      mealTypes: ['lunch', 'dinner']
    },
    // Japanese Lunch & Dinner
    {
      id: '15',
      name: 'Sashimi Platter',
      nameChinese: '生鱼片拼盘',
      category: 'Protein',
      scientificAmount: 120,
      practicalAmount: '8-10 pieces (120g)',
      calories: 160,
      protein: 26,
      carbs: 0,
      fat: 6,
      fiber: 0,
      reason: 'Pure protein, omega-3 rich, minimal processing preserves nutrients',
      cuisineStyle: ['japanese', 'all'],
      mealTypes: ['lunch', 'dinner']
    },
    {
      id: '16',
      name: 'Vegetable Tempura',
      nameChinese: '蔬菜天妇罗',
      category: 'Vegetables',
      scientificAmount: 150,
      practicalAmount: '5-6 pieces (150g)',
      calories: 200,
      protein: 5,
      carbs: 24,
      fat: 10,
      fiber: 3,
      reason: 'Light and crispy vegetables, provides variety of vitamins',
      cuisineStyle: ['japanese', 'all'],
      mealTypes: ['lunch', 'dinner', 'snack']
    },
    // Mediterranean Lunch & Dinner
    {
      id: '17',
      name: 'Hummus with Whole Wheat Pita',
      nameChinese: '鹰嘴豆泥配全麦皮塔',
      category: 'Legumes',
      scientificAmount: 150,
      practicalAmount: 'Half cup hummus + 1 pita (100g + 50g)',
      calories: 280,
      protein: 10,
      carbs: 38,
      fat: 10,
      fiber: 8,
      reason: 'Plant-based protein, high fiber, supports gut health',
      cuisineStyle: ['mediterranean', 'all'],
      mealTypes: ['lunch', 'dinner', 'snack']
    },
    {
      id: '18',
      name: 'Greek Salad',
      nameChinese: '希腊沙拉',
      category: 'Vegetables',
      scientificAmount: 250,
      practicalAmount: '1 large bowl (250g)',
      calories: 180,
      protein: 6,
      carbs: 12,
      fat: 12,
      fiber: 4,
      reason: 'Rich in vegetables, healthy fats from olive oil, supports heart health',
      cuisineStyle: ['mediterranean', 'all'],
      mealTypes: ['lunch', 'dinner']
    },
    // Snacks - Chinese
    {
      id: '19',
      name: 'Tea Eggs',
      nameChinese: '茶叶蛋',
      category: 'Protein',
      scientificAmount: 100,
      practicalAmount: '2 eggs (100g)',
      calories: 140,
      protein: 12,
      carbs: 2,
      fat: 10,
      fiber: 0,
      reason: 'Portable protein source, helps maintain energy between meals',
      cuisineStyle: ['chinese', 'all'],
      mealTypes: ['snack']
    },
    {
      id: '20',
      name: 'Mixed Nuts',
      nameChinese: '混合坚果',
      category: 'Healthy Fats',
      scientificAmount: 30,
      practicalAmount: 'Small handful (30g)',
      calories: 180,
      protein: 6,
      carbs: 6,
      fat: 16,
      fiber: 3,
      reason: 'Healthy fats support brain function, provides sustained energy',
      cuisineStyle: ['chinese', 'western', 'japanese', 'mediterranean', 'all'],
      mealTypes: ['snack']
    },
    // Snacks - Western
    {
      id: '21',
      name: 'Apple with Peanut Butter',
      nameChinese: '苹果配花生酱',
      category: 'Fruits',
      scientificAmount: 150,
      practicalAmount: '1 apple + 2 tbsp peanut butter (120g + 30g)',
      calories: 280,
      protein: 8,
      carbs: 30,
      fat: 16,
      fiber: 5,
      reason: 'Combines fiber, protein, and healthy fats for sustained energy',
      cuisineStyle: ['western', 'all'],
      mealTypes: ['snack']
    },
    // Snacks - Japanese
    {
      id: '22',
      name: 'Edamame',
      nameChinese: '毛豆',
      category: 'Legumes',
      scientificAmount: 100,
      practicalAmount: '1 small bowl (100g)',
      calories: 120,
      protein: 11,
      carbs: 10,
      fat: 5,
      fiber: 5,
      reason: 'Plant-based protein, high in fiber, supports digestive health',
      cuisineStyle: ['japanese', 'all'],
      mealTypes: ['snack']
    },
    // Snacks - Mediterranean
    {
      id: '23',
      name: 'Olives and Cheese',
      nameChinese: '橄榄配奶酪',
      category: 'Healthy Fats',
      scientificAmount: 80,
      practicalAmount: '10 olives + small cheese cube (50g + 30g)',
      calories: 200,
      protein: 8,
      carbs: 4,
      fat: 18,
      fiber: 2,
      reason: 'Mediterranean diet staple, healthy fats support heart health',
      cuisineStyle: ['mediterranean', 'all'],
      mealTypes: ['snack']
    }
  ];

  const [recommendations, setRecommendations] = useState<FoodRecommendation[]>([]);

  const handleGenerateRecommendations = async () => {
    setIsGenerating(true);

    try {
      console.log('📤 Sending food recommendations request:', {
        userId: user?.id,
        cuisine: selectedCuisine,
        mealType: selectedMealType,
        language: language,
        languageType: typeof language
      });

      const response = await fetch('/api/food-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user?.id,
          cuisine: selectedCuisine,
          mealType: selectedMealType,
          language: language,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate recommendations');
      }

      const data = await response.json();

      // Transform API response to match frontend interface
      const transformedRecommendations: FoodRecommendation[] = data.recommendations.map((rec: any) => ({
        id: rec.id,
        name: rec.name,
        nameChinese: rec.nameChinese,
        category: rec.category,
        categoryChinese: rec.categoryChinese,
        scientificAmount: rec.scientificAmount,
        practicalAmount: rec.practicalAmount,
        practicalAmountChinese: rec.practicalAmountChinese,
        calories: rec.nutrition.calories,
        protein: rec.nutrition.protein,
        carbs: rec.nutrition.carbs,
        fat: rec.nutrition.fat,
        fiber: rec.nutrition.fiber,
        reason: rec.reason,
        reasonChinese: rec.reasonChinese,
        cuisineStyle: [selectedCuisine],
        mealTypes: rec.mealTypes,
      }));

      setRecommendations(transformedRecommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      // Show error toast or message to user
      setRecommendations([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const getMealIcon = (mealType: MealType) => {
    switch (mealType) {
      case 'breakfast': return <Coffee className="w-5 h-5" />;
      case 'lunch': return <Sun className="w-5 h-5" />;
      case 'dinner': return <Moon className="w-5 h-5" />;
      case 'snack': return <Sparkles className="w-5 h-5" />;
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <ChefHat className="w-8 h-8 text-primary-custom" />
          <h1 className="text-2xl font-bold text-gray-900">{t('pageTitle')}</h1>
        </div>
        <p className="text-gray-600 text-sm">{t('pageDescription')}</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cuisine Style Selector */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {t('cuisineStyle')}
              </label>
              <Select value={selectedCuisine} onValueChange={(value) => setSelectedCuisine(value as CuisineStyle)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="chinese">{t('chinese')}</SelectItem>
                  <SelectItem value="western">{t('western')}</SelectItem>
                  <SelectItem value="japanese">{t('japanese')}</SelectItem>
                  <SelectItem value="mediterranean">{t('mediterranean')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Meal Type Selector */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                {t('mealType')}
              </label>
              <Select value={selectedMealType} onValueChange={(value) => setSelectedMealType(value as MealType)}>
                <SelectTrigger>
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

            {/* Generate Button */}
            <div className="flex items-end">
              <Button
                onClick={handleGenerateRecommendations}
                disabled={isGenerating}
                className="w-full bg-primary-custom hover:bg-primary-custom/90"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </div>
                ) : (
                  t('generateRecommendations')
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations List */}
      {recommendations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">{t('noRecommendations')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <Card key={rec.id} className="overflow-hidden">
              <CardContent className="p-6">
                {/* Header: Name and Category */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {language === 'zh' ? rec.nameChinese : rec.name}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {language === 'zh' ? rec.categoryChinese || rec.category : rec.category}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {rec.mealTypes.map(mealType => (
                      <div key={mealType} className="text-gray-400">
                        {getMealIcon(mealType)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Serving Size & Nutrition in 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  {/* Serving Size */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('servingSize')}</h4>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-900 mb-1">
                        {rec.scientificAmount}{t('grams')}
                      </div>
                      <div className="text-sm text-blue-700">
                        {language === 'zh'
                          ? (rec.practicalAmountChinese || rec.practicalAmount).replace(/\s*\([^)]*\)/g, '')
                          : rec.practicalAmount.replace(/\s*\([^)]*\)/g, '')}
                      </div>
                    </div>
                  </div>

                  {/* Nutrition */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('nutrition')}</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{t('calories')}</span>
                        <span className="text-sm font-bold text-gray-900">{rec.calories} {t('kcal')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{t('protein')}</span>
                        <span className="text-sm font-semibold text-gray-900">{rec.protein}{t('grams')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{t('carbs')}</span>
                        <span className="text-sm font-semibold text-gray-900">{rec.carbs}{t('grams')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{t('fat')}</span>
                        <span className="text-sm font-semibold text-gray-900">{rec.fat}{t('grams')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{t('fiber')}</span>
                        <span className="text-sm font-semibold text-gray-900">{rec.fiber}{t('grams')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reason - Full Width at Bottom */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-purple-700 mb-2">{t('whyThisFood')}</h4>
                  <p className="text-sm text-purple-900 leading-relaxed">
                    {language === 'zh' ? rec.reasonChinese || rec.reason : rec.reason}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
