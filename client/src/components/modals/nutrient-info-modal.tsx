import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/language-context";

type NutrientInfoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nutrientName: string;
};

type NutrientInfo = {
  name: string;
  description: string;
  benefits: string[];
  sources: string[];
  unit: string;
  dailyValue?: number;
};

// Simple inline translation function
const translateModalTitle = (title: string, language: string) => {
  if (language !== 'zh') return title;
  
  const translations: { [key: string]: string } = {
    'What it does': '功能作用',
    'Benefits for your body': '对身体的益处',
    'Good sources': '良好来源',
    'Daily Recommended Value': '每日推荐摄入量',
    'Failed to load nutrient information': '无法加载营养素信息',
    'Nutrient information not available': '营养素信息暂不可用',
    "We're working to provide comprehensive nutrient data.": '我们正在努力提供全面的营养数据。',
    'Retry': '重试',
    'Detailed nutritional information and health benefits': '详细的营养信息和健康益处',
  };
  
  return translations[title] || title;
};

const NutrientInfoModal: React.FC<NutrientInfoModalProps> = ({ 
  open, 
  onOpenChange, 
  nutrientName 
}) => {
  const { language } = useLanguage();
  const [nutrientInfo, setNutrientInfo] = useState<NutrientInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && nutrientName) {
      setIsLoading(true);
      setError(null);
      
      // Map nutrient keys to display names for lookup
      const mapNutrientName = (name: string): string => {
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
          'vitamin_c': 'Vitamin C',
          'vitamin_a': 'Vitamin A',
          'vitamin_e': 'Vitamin E',
          'vitamin_k': 'Vitamin K',
          'vitamin_b1': 'Thiamine',
          'vitamin_b2': 'Riboflavin',
          'vitamin_b3': 'Vitamin B3',
          'vitamin_b6': 'Vitamin B6',
          'folate': 'Folate',
          'vitamin_b12': 'Vitamin B12',
          'vitamin_d': 'Vitamin D',

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

        return nameMap[name.toLowerCase()] || name;
      };

      // Use your existing getNutrientInfo if available, otherwise simple local lookup
      const loadNutrientInfo = async () => {
        try {
          // First try local data
          const { getNutrientInfo } = await import('@/data/nutrients-translated');
          const mappedName = mapNutrientName(nutrientName);
          const localData = getNutrientInfo(mappedName, language);

          if (localData) {
            setNutrientInfo(localData);
          } else {
            // For now, return null if no local data
            // You can add API call later
            setNutrientInfo(null);
          }
        } catch (err) {
          setError('Failed to load nutrient data');
          setNutrientInfo(null);
        } finally {
          setIsLoading(false);
        }
      };

      loadNutrientInfo();
    }
  }, [open, nutrientName, language]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {nutrientInfo?.name || nutrientName}
          </DialogTitle>
          <DialogDescription>
            {translateModalTitle(
              'Detailed nutritional information and health benefits',
              language
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-500 text-2xl">⚠</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {translateModalTitle('Failed to load nutrient information', language)}
            </h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-4">
              We couldn't retrieve the information for "{nutrientName}". Please try again later.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {translateModalTitle('Retry', language)}
            </button>
          </div>
        ) : nutrientInfo ? (
          <div className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                {translateModalTitle('What it does', language)}
              </h3>
              <p className="text-gray-700 leading-relaxed">{nutrientInfo.description}</p>
            </div>

            {/* Benefits */}
            {nutrientInfo.benefits && nutrientInfo.benefits.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                  {translateModalTitle('Benefits for your body', language)}
                </h3>
                <ul className="space-y-2">
                  {nutrientInfo.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-500 mr-2 mt-1">•</span>
                      <span className="text-gray-700 leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sources */}
            {nutrientInfo.sources && nutrientInfo.sources.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                  {translateModalTitle('Good sources', language)}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {nutrientInfo.sources.map((source, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-sm px-3 py-1"
                    >
                      {source}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Value */}
            {nutrientInfo.dailyValue !== undefined && nutrientInfo.dailyValue !== null && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                  {translateModalTitle('Daily Recommended Value', language)}
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-lg font-semibold text-blue-900">
                    {nutrientInfo.dailyValue.toLocaleString()} {nutrientInfo.unit}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-gray-400 text-2xl">?</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {translateModalTitle('Nutrient information not available', language)}
            </h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              {translateModalTitle("We're working to provide comprehensive nutrient data.", language)}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NutrientInfoModal;