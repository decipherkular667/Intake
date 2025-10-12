import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Shield, TrendingUp, Brain, Target, Lightbulb, Wind, ChevronDown, ChevronUp, Info } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useState, useEffect, useCallback, useRef } from "react";
import { useInsights } from "@/hooks/use-insights";
import { useHealthProfile } from "@/hooks/use-health-profile";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSectionInsights } from "@/hooks/use-insights-section";

// Local formatNumber function to handle missing import
const formatNumber = (value: number, decimals: number = 1): string => {
  if (isNaN(value)) return '0';
  return value.toFixed(decimals);
};

// Optimized Translation Batcher
class TranslationBatcher {
  private static instance: TranslationBatcher;
  private pendingTranslations: Array<{ text: string; resolve: (translation: string) => void }> = [];
  private cache: Record<string, string> = {};
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 50; // ms

  static getInstance() {
    if (!TranslationBatcher.instance) {
      TranslationBatcher.instance = new TranslationBatcher();
    }
    return TranslationBatcher.instance;
  }

  async translate(text: string, targetLanguage: string): Promise<string> {
    const cacheKey = `${text}_${targetLanguage}`;
    
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    if (targetLanguage === 'en') {
      return text;
    }

    return new Promise<string>((resolve) => {
      this.pendingTranslations.push({ text, resolve });
      this.scheduleBatch(targetLanguage);
    });
  }

  private scheduleBatch(targetLanguage: string) {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatch(targetLanguage);
    }, this.BATCH_DELAY);
  }

  private async processBatch(targetLanguage: string) {
    if (this.pendingTranslations.length === 0) return;

    const batch = this.pendingTranslations.splice(0);
    const uniqueTexts = Array.from(new Set(batch.map(item => item.text)));

    try {
      const response = await fetch('/api/translate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          texts: uniqueTexts, 
          targetLanguage 
        })
      });

      if (response.ok) {
        const data = await response.json();
        const translations: string[] = data.translations || [];

        uniqueTexts.forEach((text, index) => {
          let translation = translations[index] || text;
          
          // Clean up [ZH], [EN], or any language prefix from Google Translate
          translation = translation.replace(/^\[(?:ZH|EN|[A-Z]{2})\]\s*/i, '');
          
          const cacheKey = `${text}_${targetLanguage}`;
          this.cache[cacheKey] = translation;
        });

        batch.forEach(({ text, resolve }) => {
          const cacheKey = `${text}_${targetLanguage}`;
          resolve(this.cache[cacheKey] || text);
        });
      } else {
        throw new Error('Translation API failed');
      }
    } catch (error) {
      console.log('Batch translation failed, using original texts:', error);
      batch.forEach(({ text, resolve }) => resolve(text));
    }
  }
}

// Helper function to add spacing to numbered lists
const formatTextWithSpacing = (text: string): string => {
  if (!text) return text;

  let formatted = text;

  // Add blank line before numbered items (1., 2., 3., etc.) if not already there
  formatted = formatted.replace(/([^\n])\n(\d+\.)/g, '$1\n\n$2');

  // Also ensure first numbered item has proper spacing
  formatted = formatted.replace(/^(\d+\.)/g, '\n$1');

  return formatted.trim();
};

// Optimized TranslatedText component
export const TranslatedText = ({ children }: { children: string }) => {
  const [translatedText, setTranslatedText] = useState(children);
  const { language } = useLanguage();
  const batcher = useRef(TranslationBatcher.getInstance());

    useEffect(() => {
    // Check if text contains Chinese characters
    const isChinese = /[\u4e00-\u9fff]/.test(children);

    // If language is Chinese and text is already Chinese, don't translate
    if (language === 'zh' && isChinese) {
      setTranslatedText(formatTextWithSpacing(children));
      return;
    }

    // If language is English and text is English, don't translate
    if (language === 'en' && !isChinese) {
      setTranslatedText(formatTextWithSpacing(children));
      return;
    }

    // Only translate when needed
    if (language === 'zh' && children && !isChinese) {
      batcher.current.translate(children, language).then(result => {
        setTranslatedText(formatTextWithSpacing(result));
      });
    } else if (language === 'en' && isChinese) {
      batcher.current.translate(children, 'en').then(result => {
        setTranslatedText(formatTextWithSpacing(result));
      });
    } else {
      setTranslatedText(formatTextWithSpacing(children));
    }
  }, [children, language]);

  return <>{translatedText || children}</>;
};


export default function Insights() {
  const { profile, isLoading: profileLoading } = useHealthProfile();
  const { insights, isLoading } = useInsights(profile?.id);
  const { t, language } = useLanguage();

  // Collapsible sections state - all collapsed by default
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // State for BMI/BMR info modals - only one can be open at a time
  const [activeInfo, setActiveInfo] = useState<'bmi' | 'bmr' | null>(null);

  // Get current date for section queries
  const currentDate = new Date().toISOString().split('T')[0];

  // Use separate React Query hooks for each AI section
  const conflictsQuery = useSectionInsights({
    profileId: profile?.id,
    date: currentDate,
    section: 'conflicts',
    enabled: expandedSections.has('conflicts')
  });

  const recommendationsQuery = useSectionInsights({
    profileId: profile?.id,
    date: currentDate,
    section: 'recommendations',
    enabled: expandedSections.has('recommendations')
  });

  const tcmQuery = useSectionInsights({
    profileId: profile?.id,
    date: currentDate,
    section: 'tcm',
    enabled: expandedSections.has('tcm')
  });

  const weeklyQuery = useSectionInsights({
    profileId: profile?.id,
    date: currentDate,
    section: 'weekly',
    enabled: expandedSections.has('weekly')
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  if (profileLoading || isLoading || !profile) {
    return (
      <div className="px-4 mt-4 space-y-6">
        {/* Loading state with message */}
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <Brain className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="mt-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {language === 'zh' ? '正在为您生成个性化健康建议...' : 'Generating personalized health insights...'}
            </h3>
            <p className="text-sm text-gray-600">
              {language === 'zh' ? '我们正在分析您的饮食数据，请稍候' : 'Analyzing your dietary data, please wait'}
            </p>
          </div>
        </div>

        {/* Skeleton placeholders */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 animate-pulse h-32 rounded-xl"></div>
          <div className="bg-gray-50 animate-pulse h-48 rounded-xl"></div>
          <div className="bg-gray-50 animate-pulse h-64 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const statusConfig = {
    safe: {
      bg: "bg-gradient-to-r from-green-500 to-green-600",
      icon: CheckCircle,
      title: t('healthStatusSafe'),
      description: t('noCriticalConflicts'),
    },
    caution: {
      bg: "bg-gradient-to-r from-yellow-500 to-yellow-600",
      icon: Shield,
      title: t('healthStatusCaution'),
      description: t('somePotentialConcerns'),
    },
    avoid: {
      bg: "bg-gradient-to-r from-red-500 to-red-600",
      icon: Shield,
      title: t('healthStatusAvoid'),
      description: t('criticalConflictsDetected'),
    },
  };

  const currentStatus = statusConfig[insights?.status as keyof typeof statusConfig] || statusConfig.safe;
  const StatusIcon = currentStatus.icon;

  // Calculate BMI and BMR
  const calculateBMI = () => {
    if (!profile?.height || !profile?.weight) return null;
    const heightInMeters = profile.height / 100;
    const bmi = profile.weight / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  };

  const calculateBMR = () => {
    if (!profile?.height || !profile?.weight || !profile?.birthYear) return null;

    // Calculate age
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    let age = currentYear - profile.birthYear;
    if (profile.birthMonth && currentMonth < profile.birthMonth) {
      age--;
    }

    // Mifflin-St Jeor Equation
    // Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) + 5
    // Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) - 161
    const baseBMR = 10 * profile.weight + 6.25 * profile.height - 5 * age;
    const bmr = profile.gender === 'female' ? baseBMR - 161 : baseBMR + 5;

    return Math.round(bmr);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: language === 'zh' ? '体重过轻' : 'Underweight', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (bmi < 25) return { label: language === 'zh' ? '正常' : 'Normal', color: 'text-green-600', bg: 'bg-green-50' };
    if (bmi < 30) return { label: language === 'zh' ? '超重' : 'Overweight', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { label: language === 'zh' ? '肥胖' : 'Obese', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const bmi = calculateBMI();
  const bmr = calculateBMR();
  const bmiCategory = bmi ? getBMICategory(parseFloat(bmi)) : null;

  return (
    <div className="space-y-6">
      {/* Health Status Overview */}
      <div className="px-4 mt-4">
        <div className={`${currentStatus.bg} text-white p-6 rounded-xl`}>
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <StatusIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{currentStatus.title}</h2>
              <p className="text-white/90 text-sm">{currentStatus.description}</p>
            </div>
          </div>
          <div className="bg-white/20 rounded-lg p-3 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span>{t('overallHealthScore')}</span>
              <span className="font-semibold" data-testid="health-score">
                {insights?.healthScore || 8}/10
              </span>
            </div>
          </div>
        </div>

        {/* BMI & BMR Box */}
        {(bmi || bmr) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {language === 'zh' ? '健康指标' : 'Health Metrics'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* BMI */}
              {bmi && bmiCategory && (
                <div className={`${bmiCategory.bg} rounded-lg p-4`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm text-gray-600">
                      {language === 'zh' ? '体质指数 (BMI)' : 'Body Mass Index (BMI)'}
                    </div>
                    <button
                      onClick={() => setActiveInfo(activeInfo === 'bmi' ? null : 'bmi')}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                  <div className={`text-2xl font-bold ${bmiCategory.color}`}>{bmi}</div>
                  <div className={`text-xs ${bmiCategory.color} mt-1`}>{bmiCategory.label}</div>
                </div>
              )}

              {/* BMR */}
              {bmr && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm text-gray-600">
                      {language === 'zh' ? '基础代谢率 (BMR)' : 'Basal Metabolic Rate (BMR)'}
                    </div>
                    <button
                      onClick={() => setActiveInfo(activeInfo === 'bmr' ? null : 'bmr')}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{bmr}</div>
                  <div className="text-xs text-purple-600 mt-1">
                    {language === 'zh' ? '千卡/天' : 'kcal/day'}
                  </div>
                </div>
              )}
            </div>

            {/* BMI Info Box - Full Width */}
            {activeInfo === 'bmi' && (
              <div className="mt-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">
                  {language === 'zh' ? '什么是BMI？' : 'What is BMI?'}
                </h4>
                <p className="text-xs text-gray-700 mb-3">
                  {language === 'zh'
                    ? 'BMI（体质指数）是评估体重与身高关系的指标，用于判断一个人的体重是否健康。'
                    : 'BMI (Body Mass Index) is a measure that uses your height and weight to assess whether your weight is healthy.'}
                </p>
                <h5 className="font-semibold text-gray-900 mb-1 text-xs">
                  {language === 'zh' ? '计算公式：' : 'Calculation:'}
                </h5>
                <p className="text-xs text-gray-700 mb-3 font-mono bg-gray-50 p-2 rounded">
                  BMI = {language === 'zh' ? '体重(kg) / [身高(m)]²' : 'weight(kg) / [height(m)]²'}
                </p>
                <h5 className="font-semibold text-gray-900 mb-1 text-xs">
                  {language === 'zh' ? 'BMI分类：' : 'BMI Categories:'}
                </h5>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                    {language === 'zh' ? '体重过轻: < 18.5' : 'Underweight: < 18.5'}
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                    {language === 'zh' ? '正常: 18.5 - 24.9' : 'Normal: 18.5 - 24.9'}
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
                    {language === 'zh' ? '超重: 25 - 29.9' : 'Overweight: 25 - 29.9'}
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                    {language === 'zh' ? '肥胖: ≥ 30' : 'Obese: ≥ 30'}
                  </li>
                </ul>
              </div>
            )}

            {/* BMR Info Box - Full Width */}
            {activeInfo === 'bmr' && (
              <div className="mt-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">
                  {language === 'zh' ? '什么是BMR？' : 'What is BMR?'}
                </h4>
                <p className="text-xs text-gray-700 mb-3">
                  {language === 'zh'
                    ? 'BMR（基础代谢率）是指您的身体在完全休息状态下每天燃烧的热量。这是维持基本生命功能（如呼吸、血液循环）所需的最低能量。'
                    : 'BMR (Basal Metabolic Rate) is the number of calories your body burns at rest each day. It represents the minimum energy needed to maintain basic life functions like breathing and circulation.'}
                </p>
                <h5 className="font-semibold text-gray-900 mb-1 text-xs">
                  {language === 'zh' ? '计算公式（Mifflin-St Jeor）：' : 'Calculation (Mifflin-St Jeor Equation):'}
                </h5>
                <div className="text-xs text-gray-700 mb-2 font-mono bg-gray-50 p-2 rounded space-y-1">
                  <p className="font-semibold">{language === 'zh' ? '男性：' : 'Men:'}</p>
                  <p className="ml-2">
                    {language === 'zh'
                      ? '10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄 + 5'
                      : '10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5'}
                  </p>
                  <p className="font-semibold mt-2">{language === 'zh' ? '女性：' : 'Women:'}</p>
                  <p className="ml-2">
                    {language === 'zh'
                      ? '10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄 - 161'
                      : '10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161'}
                  </p>
                </div>
                <p className="text-xs text-gray-600 italic">
                  {language === 'zh'
                    ? '注：日常活动会消耗更多热量，实际需求通常是BMR的1.2-2.0倍。'
                    : 'Note: Daily activities burn additional calories. Your actual needs are typically 1.2-2.0x your BMR.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 space-y-6">
        {/* Conflict Detection */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Shield className="text-blue-600 mr-2" />
                {t('conflictDetection')}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-custom px-2 py-1 h-auto flex items-center gap-1"
                onClick={() => toggleSection('conflicts')}
              >
                <span className="text-xs">{expandedSections.has('conflicts') ? t('collapse') : t('expand')}</span>
                {expandedSections.has('conflicts') ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Button>
            </div>

            {expandedSections.has('conflicts') && (
              <div className="space-y-3" data-testid="conflicts-list">
              {conflictsQuery.isFetching ? (
                <div className="flex items-center justify-center p-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                </div>
              ) : conflictsQuery.isError ? (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-red-800 text-sm mb-3">
                    {language === 'zh' ? '生成建议失败，请稍后再试。' : 'Failed to generate suggestions. Please try again later.'}
                  </p>
                  <Button
                    onClick={() => conflictsQuery.refetch()}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-100"
                  >
                    {language === 'zh' ? '重试' : 'Retry'}
                  </Button>
                </div>
              ) : null}
              {!conflictsQuery.isFetching && !conflictsQuery.isError && ((conflictsQuery.data || insights?.conflicts) as any[] || []).map((conflict, index) => {
                const severityConfig = {
                  low: { bg: "bg-yellow-50", border: "border-yellow-400", text: "text-yellow-800", icon: "⚠" },
                  medium: { bg: "bg-orange-50", border: "border-orange-400", text: "text-orange-800", icon: "⚠" },
                  high: { bg: "bg-red-50", border: "border-red-400", text: "text-red-800", icon: "❌" },
                };
                
                const config = severityConfig[conflict.severity as keyof typeof severityConfig] || severityConfig.medium;
                
                return (
                  <div key={index} className={`p-4 ${config.bg} rounded-lg border-l-4 ${config.border}`}>
                    <div className="flex items-center space-x-2">
                      <span>{config.icon}</span>
                      <span className={`font-medium ${config.text}`}>
                        {conflict.severity === "high" ? t('avoid') : t('cautionRequired')}
                      </span>
                    </div>
                    <p className={`${config.text} text-sm mt-1 whitespace-pre-line`}>
                      <TranslatedText>{conflict.description}</TranslatedText>
                    </p>
                  </div>
                );
              })}

              {!conflictsQuery.isFetching && !conflictsQuery.isError && (!(conflictsQuery.data || insights?.conflicts) || ((conflictsQuery.data || insights?.conflicts) as any[] || []).length === 0) && (
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="text-green-600 w-5 h-5" />
                    <span className="font-medium text-green-800">✅ {t('safeFoodsToday')}</span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    {t('allFoodsSafe')}
                  </p>
                </div>
              )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Nutrition Progress */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Target className="text-blue-600 mr-2" />
                {t('todaysNutritionProgress')}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-custom px-2 py-1 h-auto flex items-center gap-1"
                onClick={() => toggleSection('dailynutrition')}
              >
                <span className="text-xs">{expandedSections.has('dailynutrition') ? t('collapse') : t('expand')}</span>
                {expandedSections.has('dailynutrition') ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Button>
            </div>

            {expandedSections.has('dailynutrition') && ((() => {
              const dailyTotals = insights?.dailyTotals || {
                calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, sugar: 0
              };
              
              const targets = {
                calories: 2000,
                protein: 60,
                carbs: 250,
                fat: 65,
                fiber: 25,
                sodium: 2300
              };

              const progress = [
                {
                  name: t('calories'),
                  current: dailyTotals.calories,
                  target: targets.calories,
                  unit: t('cal')
                },
                {
                  name: t('protein'),
                  current: dailyTotals.protein,
                  target: targets.protein,
                  unit: language === 'zh' ? '克' : 'g'
                },
                {
                  name: t('carbs'),
                  current: dailyTotals.carbs,
                  target: targets.carbs,
                  unit: language === 'zh' ? '克' : 'g'
                },
                {
                  name: t('fat'),
                  current: dailyTotals.fat,
                  target: targets.fat,
                  unit: language === 'zh' ? '克' : 'g'
                },
                {
                  name: t('fiber'),
                  current: dailyTotals.fiber,
                  target: targets.fiber,
                  unit: language === 'zh' ? '克' : 'g'
                }
              ];

              return (
                <div className="space-y-4">
                  {progress.map((item, index) => {
                    const percentage = Math.min(100, (item.current / item.target) * 100);
                    const color = percentage >= 80 ? 'bg-green-500' : 
                                percentage >= 50 ? 'bg-yellow-500' : 'bg-red-400';
                    const bgColor = percentage >= 80 ? 'bg-green-50' : 
                                   percentage >= 50 ? 'bg-yellow-50' : 'bg-red-50';
                    const textColor = percentage >= 80 ? 'text-green-700' : 
                                     percentage >= 50 ? 'text-yellow-700' : 'text-red-700';
                    
                    return (
                      <div key={item.name} className={`p-4 rounded-lg ${bgColor}`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className={`font-medium ${textColor} capitalize`}>{item.name}</span>
                          <span className={`text-sm ${textColor}`}>
                            {formatNumber(item.current, 0)} / {formatNumber(item.target, 0)}{item.unit}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${color} transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className={`text-xs ${textColor} mt-1`}>
                          {formatNumber(percentage, 0)}% {t('ofDailyGoal')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })())}
          </CardContent>
        </Card>

        {/* Weekly Summary */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrendingUp className="text-blue-600 mr-2" />
                {t("weeklySummary")}
                {/* {insights?.weeklySummary?.period || t("weeklySummary")} */}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-custom px-2 py-1 h-auto flex items-center gap-1"
                onClick={() => toggleSection('weeklysummary')}
              >
                <span className="text-xs">{expandedSections.has('weeklysummary') ? t('collapse') : t('expand')}</span>
                {expandedSections.has('weeklysummary') ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Button>
            </div>

            {expandedSections.has('weeklysummary') && (
              <>
                {insights?.weeklySummary ? (
                  <>
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-700">{t('weeklyAverages')}</h4>
                        {insights.weeklySummary.startDate && insights.weeklySummary.endDate && (
                          <span className="text-sm font-semibold text-gray-600">
                            {new Date(insights.weeklySummary.startDate).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })} - {new Date(insights.weeklySummary.endDate).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      {(() => {
                        const weeklyTargets = {
                          calories: 2000,
                          protein: 60,
                          carbs: 250,
                          fat: 65,
                          fiber: 25
                        };

                        const weeklyData = [
                          { name: t('calories'), current: insights.weeklySummary.calories, target: weeklyTargets.calories, unit: t('cal') },
                          { name: t('protein'), current: insights.weeklySummary.protein, target: weeklyTargets.protein, unit: t('g') },
                          { name: t('carbs'), current: insights.weeklySummary.carbs, target: weeklyTargets.carbs, unit: t('g') },
                          { name: t('fat'), current: insights.weeklySummary.fat, target: weeklyTargets.fat, unit: t('g') },
                          { name: t('fiber'), current: insights.weeklySummary.fiber, target: weeklyTargets.fiber, unit: t('g') }
                        ];

                        return (
                          <div className="space-y-3">
                            {weeklyData.map((item) => {
                              const percentage = Math.min(100, (item.current / item.target) * 100);
                              const color = percentage >= 80 ? 'bg-green-500' :
                                           percentage >= 50 ? 'bg-yellow-500' : 'bg-red-400';
                              const bgColor = percentage >= 80 ? 'bg-green-50' :
                                             percentage >= 50 ? 'bg-yellow-50' : 'bg-red-50';
                              const textColor = percentage >= 80 ? 'text-green-700' :
                                               percentage >= 50 ? 'text-yellow-700' : 'text-red-700';

                              return (
                                <div key={item.name} className={`p-3 rounded-lg ${bgColor}`}>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className={`font-medium ${textColor}`}>{item.name}</span>
                                    <span className={`text-sm ${textColor}`}>
                                      {formatNumber(item.current, 0)} / {formatNumber(item.target, 0)}{item.unit}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${color} transition-all duration-500`}
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <div className={`text-xs ${textColor} mt-1`}>
                                    {formatNumber(percentage, 0)}% {t('ofRecommendedIntake')}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-indigo-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-indigo-700">{insights.weeklySummary.variety}/10</div>
                        <div className="text-sm text-indigo-600">{t('foodVarietyScore')}</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-700">{insights.weeklySummary.daysTracked}</div>
                        <div className="text-sm text-green-600">{t('daysTracked')}</div>
                      </div>
                    </div>

                    {/* AI Weekly Analysis Toggle */}
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full flex items-center justify-center gap-2"
                        onClick={() => toggleSection('weekly')}
                      >
                        <Brain className="w-4 h-4" />
                        <span className="text-sm">
                          {expandedSections.has('weekly')
                            ? (language === 'zh' ? '隐藏周分析' : 'Hide Weekly Analysis')
                            : (language === 'zh' ? '查看周分析' : 'View Weekly Analysis')}
                        </span>
                        {expandedSections.has('weekly') ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </Button>

                      {expandedSections.has('weekly') && (
                        <>
                          {weeklyQuery.isLoading ? (
                            <div className="flex items-center justify-center p-6">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                            </div>
                          ) : weeklyQuery.isError ? (
                            <div className="p-4 bg-red-50 rounded-lg border border-red-200 mt-3">
                              <p className="text-red-800 text-sm mb-3">
                                {language === 'zh' ? '生成周分析失败，请稍后再试。' : 'Failed to generate weekly analysis. Please try again later.'}
                              </p>
                              <Button
                                onClick={() => weeklyQuery.refetch()}
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-300 hover:bg-red-100"
                              >
                                {language === 'zh' ? '重试' : 'Retry'}
                              </Button>
                            </div>
                          ) : weeklyQuery.data ? (
                            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 mt-3">
                              <h5 className="font-medium text-purple-800 mb-2 flex items-center">
                                <Brain className="w-4 h-4 mr-1" />
                                {t('aiWeeklyAnalysis')}
                              </h5>
                              <p className="text-purple-700 text-sm whitespace-pre-line"><TranslatedText>{weeklyQuery.data}</TranslatedText></p>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center p-8 text-gray-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t('trackMoreMeals')}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Health Recommendations */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Lightbulb className="text-purple-600 mr-2" />
                {t('healthRecommendations')}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-custom px-2 py-1 h-auto flex items-center gap-1"
                onClick={() => toggleSection('recommendations')}
              >
                <span className="text-xs">{expandedSections.has('recommendations') ? t('collapse') : t('expand')}</span>
                {expandedSections.has('recommendations') ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Button>
            </div>

            {expandedSections.has('recommendations') && (
              <div className="space-y-4" data-testid="health-recommendations-list">
              {recommendationsQuery.isLoading ? (
                <div className="flex items-center justify-center p-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : recommendationsQuery.isError ? (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-red-800 text-sm mb-3">
                    {language === 'zh' ? '生成建议失败，请稍后再试。' : 'Failed to generate suggestions. Please try again later.'}
                  </p>
                  <Button
                    onClick={() => recommendationsQuery.refetch()}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-100"
                  >
                    {language === 'zh' ? '重试' : 'Retry'}
                  </Button>
                </div>
              ) : null}
              {!recommendationsQuery.isLoading && !recommendationsQuery.isError && ((recommendationsQuery.data || insights?.recommendations) as any[] || [])
                .filter((rec: any) => rec.type === "diet" || rec.type === "lifestyle")
                .map((rec, index) => {
                const typeConfig = {
                  diet: { bg: "bg-purple-50", icon: Lightbulb, color: "text-purple-800" },
                  lifestyle: { bg: "bg-green-50", icon: Target, color: "text-green-800" },
                };
                
                const config = typeConfig[rec.type as keyof typeof typeConfig] || typeConfig.diet;
                const RecommendationIcon = config.icon;
                
                return (
                  <div key={index} className={`p-4 ${config.bg} rounded-lg`}>
                    <h4 className={`font-medium ${config.color} mb-2 flex items-center`}>
                      <RecommendationIcon className="w-4 h-4 mr-1" />
                      <TranslatedText>{rec.title}</TranslatedText>
                    </h4>
                    <p className={`${config.color} text-sm whitespace-pre-line`}><TranslatedText>{rec.description}</TranslatedText></p>
                    {rec.priority && (
                      <Badge 
                        variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "default" : "secondary"}
                        className="mt-2"
                      >
                        <TranslatedText>{rec.priority}</TranslatedText> <TranslatedText>priority</TranslatedText>
                      </Badge>
                    )}
                  </div>
                );
              })}

              {!recommendationsQuery.isLoading && !recommendationsQuery.isError && ((recommendationsQuery.data || insights?.recommendations) as any[] || [])
                .filter((rec: any) => rec.type === "diet" || rec.type === "lifestyle").length === 0 && (
                <div className="text-center p-8 text-gray-500">
                  <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t('trackMoreMeals')}</p>
                </div>
              )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Traditional Chinese Medicine Health Recommendations */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Wind className="text-indigo-600 mr-2" />
                {t('tcmRecommendations')}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-custom px-2 py-1 h-auto flex items-center gap-1"
                onClick={() => toggleSection('tcm')}
              >
                <span className="text-xs">{expandedSections.has('tcm') ? t('collapse') : t('expand')}</span>
                {expandedSections.has('tcm') ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Button>
            </div>

            {expandedSections.has('tcm') && (
              <div className="space-y-4" data-testid="tcm-recommendations-list">
              {tcmQuery.isLoading ? (
                <div className="flex items-center justify-center p-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : tcmQuery.isError ? (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-red-800 text-sm mb-3">
                    {language === 'zh' ? '生成建议失败，请稍后再试。' : 'Failed to generate suggestions. Please try again later.'}
                  </p>
                  <Button
                    onClick={() => tcmQuery.refetch()}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-100"
                  >
                    {language === 'zh' ? '重试' : 'Retry'}
                  </Button>
                </div>
              ) : null}
              {!tcmQuery.isLoading && !tcmQuery.isError && ((tcmQuery.data || insights?.recommendations) as any[] || [])
                .filter((rec: any) => rec.type === "tcm")
                .map((rec, index) => (
                  <div key={index} className="p-4 bg-indigo-50 rounded-lg">
                    <h4 className="font-medium text-indigo-800 mb-2 flex items-center">
                      <Wind className="w-4 h-4 mr-1" />
                      <TranslatedText>{rec.title}</TranslatedText>
                    </h4>
                    <p className="text-indigo-800 text-sm whitespace-pre-line"><TranslatedText>{rec.description}</TranslatedText></p>
                    {rec.priority && (
                      <Badge
                        variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "default" : "secondary"}
                        className="mt-2"
                      >
                        {t(`${rec.priority}Priority`)}
                      </Badge>
                    )}
                  </div>
                ))}

              {!tcmQuery.isLoading && !tcmQuery.isError && ((tcmQuery.data || insights?.recommendations) as any[] || [])
                .filter((rec: any) => rec.type === "tcm").length === 0 && (
                <div className="text-center p-8 text-gray-500">
                  <Wind className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t('trackMoreMeals')}</p>
                </div>
              )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}