// Translation caching system for improved performance
import { LRUCache } from 'lru-cache';

interface CacheItem {
  translations: string[];
  timestamp: number;
}

// In-memory LRU cache for translations
const translationCache = new LRUCache<string, CacheItem>({
  max: 10000, // Maximum number of cached translations
  ttl: 1000 * 60 * 60 * 24, // 24 hours TTL
  updateAgeOnGet: true, // Reset TTL on access
});

// Common food translations that can be preloaded
const commonFoodTranslations: Record<string, Record<string, string>> = {
  zh: {
    'Apple': '苹果',
    'Banana': '香蕉',
    'Orange': '橙子',
    'Grapes': '葡萄',
    'Rice': '米饭',
    'Chicken': '鸡肉',
    'Fish': '鱼',
    'Beef': '牛肉',
    'Pork': '猪肉',
    'Vegetables': '蔬菜',
    'Fruit': '水果',
    'Water': '水',
    'Milk': '牛奶',
    'Bread': '面包',
    'Egg': '鸡蛋',
    'Noodles': '面条',
    'Soup': '汤',
    'Salad': '沙拉',
    'Tea': '茶',
    'Coffee': '咖啡'
  }
};

// Generate cache key for translation request
function generateCacheKey(texts: string[], targetLanguage: string): string {
  return `${targetLanguage}:${texts.sort().join('|')}`;
}

// Check cache for existing translations
export function getCachedTranslation(texts: string[], targetLanguage: string): string[] | null {
  const cacheKey = generateCacheKey(texts, targetLanguage);
  const cached = translationCache.get(cacheKey);

  if (cached && cached.timestamp > Date.now() - (1000 * 60 * 60 * 24)) {
    console.log('✅ Cache hit for translation:', cacheKey);
    return cached.translations;
  }

  return null;
}

// Store translations in cache
export function setCachedTranslation(texts: string[], targetLanguage: string, translations: string[]): void {
  const cacheKey = generateCacheKey(texts, targetLanguage);
  translationCache.set(cacheKey, {
    translations,
    timestamp: Date.now()
  });
  console.log('💾 Cached translation:', cacheKey);
}

// Get translations from preloaded common foods
export function getCommonFoodTranslations(texts: string[], targetLanguage: string): { translations: string[], hasAll: boolean } {
  const commonTranslations = commonFoodTranslations[targetLanguage] || {};
  const results: string[] = [];
  let hasAll = true;

  for (const text of texts) {
    const translation = commonTranslations[text.trim()];
    if (translation) {
      results.push(translation);
    } else {
      results.push(text); // Keep original if no common translation
      hasAll = false;
    }
  }

  return { translations: results, hasAll };
}

// Clear expired cache entries
export function clearExpiredCache(): void {
  // LRU cache handles this automatically, but we can force cleanup
  translationCache.purgeStale();
  console.log('🧹 Cleared expired translation cache entries');
}

// Get cache statistics
export function getCacheStats() {
  return {
    size: translationCache.size,
    maxSize: translationCache.max,
    hitRate: translationCache.calculatedSize / (translationCache.calculatedSize + translationCache.size) || 0
  };
}