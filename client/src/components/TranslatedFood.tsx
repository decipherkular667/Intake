// components/TranslatedFood.tsx
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language-context';

// Common food name translations
type FoodTranslations = {
  [key: string]: string;
};

const commonFoodTranslations: {
  zh: FoodTranslations;
  en: FoodTranslations;
} = {
  zh: {
    'Banana': '香蕉',
    'Apple': '苹果',
    'Orange': '橙子',
    'Chicken': '鸡肉',
    'Chicken Breast': '鸡胸肉',
    'Beef': '牛肉',
    'Pork': '猪肉',
    'Fish': '鱼',
    'Rice': '米饭',
    'Bread': '面包',
    'Milk': '牛奶',
    'Egg': '鸡蛋',
    'Eggs': '鸡蛋',
    'Cheese': '奶酪',
    'Yogurt': '酸奶',
    'Broccoli': '西兰花',
    'Spinach': '菠菜',
    'Carrot': '胡萝卜',
    'Potato': '土豆',
    'Sweet Potato': '红薯',
    'Tomato': '西红柿',
    'Onion': '洋葱',
    'Garlic': '大蒜',
    'Avocado': '牛油果',
    'Salmon': '三文鱼',
    'Tuna': '金枪鱼',
    'Shrimp': '虾',
    'Almonds': '杏仁',
    'Walnuts': '核桃',
    'Peanuts': '花生',
    'Cashews': '腰果',
    'Oats': '燕麦',
    'Quinoa': '藜麦',
    'Brown Rice': '糙米',
    'White Rice': '白米',
    'Pasta': '意大利面',
    'Noodles': '面条',
    'Tofu': '豆腐',
    'Beans': '豆类',
    'Lentils': '扁豆',
    'Chickpeas': '鹰嘴豆',
    'Strawberries': '草莓',
    'Blueberries': '蓝莓',
    'Grapes': '葡萄',
    'Watermelon': '西瓜',
    'Pineapple': '菠萝',
    'Mango': '芒果',
    'Beer': '啤酒',
    'Vodka': '伏特加',
    'Wine': '葡萄酒',
    'Whiskey': '威士忌',
  },
  en: {
    '香蕉': 'Banana',
    '苹果': 'Apple',
    '橙子': 'Orange',
    '鸡肉': 'Chicken',
    '鸡胸肉': 'Chicken Breast',
    '牛肉': 'Beef',
    '猪肉': 'Pork',
    '鱼': 'Fish',
    '米饭': 'Rice',
    '面包': 'Bread',
    '牛奶': 'Milk',
    '鸡蛋': 'Egg',
    '奶酪': 'Cheese',
    '酸奶': 'Yogurt',
    '西兰花': 'Broccoli',
    '菠菜': 'Spinach',
    '胡萝卜': 'Carrot',
    '土豆': 'Potato',
    '红薯': 'Sweet Potato',
    '西红柿': 'Tomato',
    '洋葱': 'Onion',
    '大蒜': 'Garlic',
    '牛油果': 'Avocado',
    '三文鱼': 'Salmon',
    '金枪鱼': 'Tuna',
    '虾': 'Shrimp',
    '杏仁': 'Almonds',
    '核桃': 'Walnuts',
    '花生': 'Peanuts',
    '腰果': 'Cashews',
    '燕麦': 'Oats',
    '藜麦': 'Quinoa',
    '糙米': 'Brown Rice',
    '白米': 'White Rice',
    '意大利面': 'Pasta',
    '面条': 'Noodles',
    '豆腐': 'Tofu',
    '豆类': 'Beans',
    '扁豆': 'Lentils',
    '鹰嘴豆': 'Chickpeas',
    '草莓': 'Strawberries',
    '蓝莓': 'Blueberries',
    '葡萄': 'Grapes',
    '西瓜': 'Watermelon',
    '菠萝': 'Pineapple',
    '芒果': 'Mango',
    '啤酒': 'Beer',
    '伏特加': 'Vodka',
    '葡萄酒': 'Wine',
    '威士忌': 'Whiskey',
  }
};



interface TranslatedFoodProps {
  children: string;
  fallback?: string;
}


const translationCache: Record<string, string> = {};

export function TranslatedFood({ children, fallback }: TranslatedFoodProps) {
  const { language } = useLanguage();
  const [translatedName, setTranslatedName] = useState(children);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const isChinese = /[\u4e00-\u9fff]/.test(children);
    const cacheKey = `${language}-${children}`;

    // Check cache first
    if (translationCache[cacheKey]) {
      setTranslatedName(translationCache[cacheKey]);
      return;
    }

    // English mode: check for common Chinese translations first, then API
    if (language === 'en' && isChinese) {
      const commonTranslation = commonFoodTranslations.en[children];
      if (commonTranslation) {
        setTranslatedName(commonTranslation);
        translationCache[cacheKey] = commonTranslation;
        return;
      }

      setIsTranslating(true);
      fetch('/api/translate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: [children],
          targetLanguage: 'en'
        })
      })
      .then(response => response.json())
      .then(data => {
        const translation = data.translations?.[0] || children;
        translationCache[cacheKey] = translation;
        setTranslatedName(translation);
      })
      .catch((error) => {
        console.warn('Food translation failed:', error);
        setTranslatedName(fallback || children);
      })
      .finally(() => {
        setIsTranslating(false);
      });
      return;
    }

    if (language === 'en') {
      setTranslatedName(children);
      translationCache[cacheKey] = children;
      return;
    }

    // Chinese mode: check for common translations first
    const commonTranslation = commonFoodTranslations.zh[children];
    if (commonTranslation) {
      setTranslatedName(commonTranslation);
      translationCache[cacheKey] = commonTranslation;
      return;
    }

    if (language === 'zh' && !isChinese && children.trim()) {
      setIsTranslating(true);
      
      fetch('/api/translate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: [children],
          targetLanguage: 'zh'
        })
      })
      .then(response => response.json())
      .then(data => {
        const translation = data.translations?.[0] || children;
        translationCache[cacheKey] = translation; // Cache it
        setTranslatedName(translation);
      })
      .catch((error) => {
        console.warn('Food translation failed:', error);
        setTranslatedName(fallback || children);
      })
      .finally(() => {
        setIsTranslating(false);
      });
    } else {
      setTranslatedName(children);
      translationCache[cacheKey] = children;
    }
  }, [children, language, fallback]);

  if (isTranslating && children.length > 10) {
    return <span className="opacity-70">{children}</span>;
  }

  return <>{translatedName}</>;
}

// Component specifically for nutrient modal section titles
export function ModalSectionTitle({ children }: { children: string }) {
  const { language } = useLanguage();

  const sectionTitleTranslations: { zh: FoodTranslations } = {
    zh: {
      'What it does': '功能作用',
      'Benefits for your body': '对身体的益处',
      'Good sources': '良好来源',
      'Daily Recommended Value': '每日推荐摄入量',
      'Failed to load nutrient information': '无法加载营养素信息',
      'Nutrient information not available': '营养素信息暂不可用',
      "We're working to provide comprehensive nutrient data.": '我们正在努力提供全面的营养数据。',
      'Retry': '重试',
    }
  };

  if (language === 'zh') {
    return <>{sectionTitleTranslations.zh[children] || children}</>;
  }

  return <>{children}</>;
}