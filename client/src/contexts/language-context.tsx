// contexts/language-context.tsx - Enhanced Version
import { createContext, useContext, useState, ReactNode, useCallback, useRef } from "react";
import { nutrientData, type Language, type NutrientDataByLanguage } from "@/data/nutrients-translated";

type LanguageType = 'en' | 'zh';

interface LanguageContextType {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (key: string, fallback?: string) => string;
  translateAuto: (text: string) => string;
  getNutrientInfo: (nutrientName: string) => Promise<any>;
}

// Your existing comprehensive translations
const translations = {
  en: {
    // App Title
    appTitle: "IntakeAI",

    // Welcome Page
    welcomeTitle: "IntakeAI Health",
    welcomeSubtitle: "Your personal health and nutrition companion",
    login: "Sign In",
    register: "Sign Up",
    createAccount: "Create Account",
    alreadyHaveAccount: "Already have an account?",
    dontHaveAccount: "Don't have an account?",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    firstName: "First Name",
    lastName: "Last Name",
    signIn: "Sign In",
    signUp: "Sign Up",
    signInDescription: "Enter your email and password to access your account",
    enterYourEmail: "Enter your email",
    enterYourPassword: "Enter your password",
    signingIn: "Signing in...",
    dontHaveAccountSignUp: "Don't have an account? Sign up",
    createAccountDescription: "Enter your information to create a new account",
    createPassword: "Create a password",
    confirmYourPassword: "Confirm your password",
    creatingAccount: "Creating account...",
    alreadyHaveAccountSignIn: "Already have an account? Sign in",
    weak: "Weak",
    medium: "Medium",
    strong: "Strong",

    // Dashboard
    welcomeBack: "Welcome back",
    readyToTrack: "Ready to track your health journey today?",
    signOut: "Sign out",
    profile: "Profile",
    completeHealthProfile: "Complete your health profile to get personalized insights",
    updateHealthProfile: "Update Health Profile",
    foodDiary: "Food Diary",
    logMealsTrackNutrition: "Log your meals and track your nutrition intake",
    openFoodDiary: "Open Food Diary",
    viewHealthTrends: "View your health trends and nutritional analysis",
    viewInsights: "View Insights",

    // Navigation
    health: "Health",
    diary: "Food Diary",
    insights: "Insights",
    
    healthProfileDescription: "Help us provide personalized nutrition insights",
    profileCompletion: "Profile Completion",
    enterFullName: "Enter your full name",
    selectYear: "Select year",
    selectMonth: "Select month",
    
    searchAddConditions: "Search & Add Conditions",
    typeConditionPlaceholder: "Type condition (e.g., diabetes, hypertension)",
    
    foodAllergies: "Food Allergies",
    addAllergies: "Add Allergies", 
    typeAllergyPlaceholder: "Type allergy (e.g., nuts, dairy, shellfish)",
    
    currentMedications: "Current Medications",
    addMedication: "Add Medication",
    enterMedicationName: "Enter medication name",
    
    smokingHabits: "Smoking Habits",
    doYouSmoke: "Do you smoke?",
    
    january: "January",
    february: "February",
    march: "March", 
    april: "April",
    may: "May",
    june: "June",
    july: "July",
    august: "August",
    september: "September",
    october: "October", 
    november: "November",
    december: "December",
    
    saveHealthProfile: "Save Health Profile",
    saving: "Saving...",
    searchFoodPlaceholder: "Type food item (e.g., banana, chicken breast)",
    
    micronutrients: "Micronutrients",
    expand: "Expand",
    collapse: "Collapse",
    healthProfile: "Health Profile",
    personalInfo: "Personal Information",
    name: "Name",
    birthYear: "Birth Year",
    birthMonth: "Birth Month",
    weight: "Weight",
    height: "Height",
    unitSystem: "Unit System",
    metric: "Metric",
    imperial: "Imperial",
    allergies: "Allergies",
    medicalConditions: "Medical Conditions",
    smokingStatus: "Smoking Status",
    never: "Never",
    former: "Former",
    current: "Current",
    gender: "Gender",
    male: "Male",
    female: "Female",
    none: "None",
    saveProfile: "Save Profile",
    profileSaved: "Profile saved successfully!",
    failedToSave: "Failed to save profile. Please try again.",
    
    // Food Diary
    balanceAndHarmony: "Balance and Harmony",
    aiServiceUnavailable: "AI Service Unavailable",
    aiServiceUnavailableDesc: "Unable to generate personalized insights at this time. Add more food entries and try again later.",
    trackYourMeals: "Track Your Meals",
    trackYourMealsDesc: "Continue logging your food intake to build a better profile for AI analysis.",
    lowPriority: "Low",
    mediumPriority: "Medium",
    highPriority: "High",
    priority: "priority",
    noFoodEntries: "No food entries yet",
    startTrackingNutrition: "Start tracking your nutrition by adding your first meal above.",
    todaysNutrition: "Today's Nutrition",
    calories: "Calories",
    protein: "Protein",
    carbs: "Carbs",
    fat: "Fat",
    fiber: "Fiber",
    sodium: "Sodium",
    sugar: "Sugar",
    addFoodItem: "Add Food Item",
    searchFood: "Search Food",
    servingSize: "Serving Size",
    unit: "Unit",
    meal: "Meal",
    breakfast: "Breakfast",
    lunch: "Lunch", 
    dinner: "Dinner",
    snack: "Snack",
    addToDiary: "Add to Diary",
    foodAdded: "Food Added",
    foodAddedDesc: "has been added to your diary.",
    selected: "Selected:",
    cal: "kcal",
    g: 'g',
    kg: 'kg',
    ml: 'ml',
    l: 'l',
    
    // Insights
    healthStatus: "Health Status",
    healthStatusSafe: "Health Status: Safe",
    healthStatusCaution: "Health Status: Caution",
    healthStatusAvoid: "Health Status: Avoid",
    noCriticalConflicts: "No critical conflicts detected",
    somePotentialConcerns: "Some potential concerns identified", 
    criticalConflictsDetected: "Critical conflicts detected",
    overallHealthScore: "Overall Health Score",
    conflictDetection: "Conflict Detection",
    todaysNutritionProgress: "Today's Nutrition Progress",
    weeklySummary: "Weekly Summary",
    weeklyAverages: "Weekly Averages",
    foodVarietyScore: "Food Variety Score",
    daysTracked: "Days Tracked",
    weeklyInsights: "Weekly Insights",
    aiWeeklyAnalysis: "Weekly Analysis",
    healthRecommendations: "Health Recommendations",
    tcmRecommendations: "Traditional Chinese Medicine Health Recommendations",
    safeFoodsToday: "Safe Foods Today",
    allFoodsSafe: "All food items consumed are compatible with your health profile",
    noConflictsDetected: "No Conflicts Detected",
    currentFoodChoicesSafe: "Your current food choices are safe with your health profile",
    trackMoreMeals: "Track more meals to see your weekly summary",
    ofDailyGoal: "of daily goal",
    ofRecommendedIntake: "of recommended daily intake",
    seasonalBalance: "Seasonal Balance",
    
    // Recommendations
    optimizeProteinIntake: "Optimize Protein Intake",
    increaseFiberIntake: "Increase Fiber Intake",
    reduceSodiumIntake: "Reduce Sodium Intake",
    bloodSugarManagement: "Blood Sugar Management",
    bloodPressureSupport: "Blood Pressure Support",
    heartHealthyNutrition: "Heart-Healthy Nutrition",
    dietOptimization: "Diet Optimization",
    healthGoals: "Health Goals",
    portionControl: "Portion Control",
    currentIntake: "Current intake:",
    currentFiber: "Current fiber:",
    currentSodium: "Current sodium:",
    todaysCarbs: "Today's carbs:",
    todaysFat: "Today's fat:",
    monitorSodiumIntake: "Monitor sodium intake (today:",
    
    // Common
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    error: "Error",

    // Food deletion
    foodDeleted: "Food Deleted",
    foodDeletedDesc: "has been removed from your diary",
    failedToDeleteFood: "Failed to delete food entry. Please try again.",

    // Food selection and adding
    noFoodSelected: "No Food Selected",
    selectFoodFirst: "Please search and select a food item first.",
    failedToAddFood: "Failed to add food entry. Please try again.",

    // Units
    piece: "piece (~100g)",
    cup: "cup (~240g)",
    ounce: "ounce (~28g)",
    tablespoon: "tablespoon (~15g)",
    teaspoon: "teaspoon (~5g)",
    gram: "gram",
    
    // Nutrients
    vitaminC: "Vitamin C",
    vitaminA: "Vitamin A", 
    vitaminK: "Vitamin K",
    vitaminB6: "Vitamin B6",
    folate: "Folate",
    potassium: "Potassium",
    magnesium: "Magnesium",
    calcium: "Calcium",
    iron: "Iron",
    balancedNutritionMessage: "Your current nutrition intake looks balanced. Continue monitoring your daily goals.",
    keepUpGoodWork: "Keep up the good work! Consider adding more variety to your vegetable intake.",
    balanceAndHarmonyMessage: "Your current dietary choices support overall balance. Consider seasonal foods and mindful eating practices for optimal health.",

    // Alcohol
    alcohol: "Alcohol",

    // Conflict severity labels
    avoid: "Avoid",
    cautionRequired: "Caution Required",

  },
  zh: {
    // App Title
    appTitle: "营养智能",

    // Welcome Page
    welcomeTitle: "营养智能健康",
    welcomeSubtitle: "您的个人健康与营养伴侣",
    login: "登录",
    register: "注册",
    createAccount: "创建账户",
    alreadyHaveAccount: "已有账户？",
    dontHaveAccount: "还没有账户？",
    email: "邮箱",
    password: "密码",
    confirmPassword: "确认密码",
    firstName: "名字",
    lastName: "姓氏",
    signIn: "登录",
    signUp: "注册",
    signInDescription: "输入您的邮箱和密码来登录您的账户",
    enterYourEmail: "请输入您的邮箱",
    enterYourPassword: "请输入您的密码",
    signingIn: "登录中...",
    dontHaveAccountSignUp: "还没有账户？立即注册",
    createAccountDescription: "输入您的信息来创建新账户",
    createPassword: "创建密码",
    confirmYourPassword: "确认您的密码",
    creatingAccount: "创建账户中...",
    alreadyHaveAccountSignIn: "已有账户？立即登录",
    weak: "弱",
    medium: "中等",
    strong: "强",

    // Dashboard
    welcomeBack: "欢迎回来",
    readyToTrack: "准备好开始今天的健康之旅了吗？",
    signOut: "退出登录",
    profile: "档案",
    completeHealthProfile: "完善您的健康档案以获得个性化建议",
    updateHealthProfile: "更新健康档案",
    foodDiary: "饮食日记",
    logMealsTrackNutrition: "记录您的膳食并跟踪营养摄入",
    openFoodDiary: "打开饮食日记",
    viewHealthTrends: "查看您的健康趋势和营养分析",
    viewInsights: "查看洞察",

    // Navigation
    health: "健康",
    diary: "饮食日记",
    insights: "健康洞察",
    
    healthProfileDescription: "帮助我们为您提供个性化营养建议",
    profileCompletion: "档案完成度",
    enterFullName: "请输入您的全名",
    selectYear: "选择年份",
    selectMonth: "选择月份",
    
    searchAddConditions: "搜索并添加疾病",
    typeConditionPlaceholder: "输入疾病名称（如：糖尿病、高血压）",
    
    foodAllergies: "食物过敏",
    addAllergies: "添加过敏源",
    typeAllergyPlaceholder: "输入过敏源（如：坚果、乳制品、海鲜）",
    
    currentMedications: "当前用药",
    addMedication: "添加药物",
    enterMedicationName: "请输入药物名称",
    
    smokingHabits: "吸烟习惯",
    doYouSmoke: "您吸烟吗？",
    
    january: "一月",
    february: "二月", 
    march: "三月",
    april: "四月",
    may: "五月",
    june: "六月",
    july: "七月",
    august: "八月",
    september: "九月",
    october: "十月",
    november: "十一月",
    december: "十二月",
    
    saveHealthProfile: "保存健康档案",
    saving: "保存中...",
    searchFoodPlaceholder: "输入食物名称 (例如：香蕉、鸡胸肉)",
    balanceAndHarmony: "平衡与和谐",
    aiServiceUnavailable: "AI服务不可用",
    aiServiceUnavailableDesc: "目前无法生成个性化洞察。请添加更多食物条目，然后稍后重试。",
    trackYourMeals: "跟踪您的膳食",
    trackYourMealsDesc: "继续记录您的食物摄入量，以便为AI分析建立更好的档案。",
    lowPriority: "低",
    mediumPriority: "中等",
    highPriority: "高",
    priority: "优先级",
    micronutrients: "微量营养素",
    expand: "展开",
    collapse: "收起",
    healthProfile: "健康档案",
    personalInfo: "个人信息",
    name: "姓名",
    birthYear: "出生年份",
    birthMonth: "出生月份",
    weight: "体重",
    height: "身高",
    unitSystem: "单位系统",
    metric: "公制",
    imperial: "英制",
    allergies: "过敏症",
    medicalConditions: "疾病史",
    smokingStatus: "吸烟状况",
    never: "从不吸烟",
    former: "曾经吸烟",
    current: "目前吸烟",
    gender: "性别",
    male: "男性",
    female: "女性",
    none: "无",
    saveProfile: "保存档案",
    profileSaved: "档案保存成功！",
    failedToSave: "保存档案失败，请重试。",
    
    weeklySummary: "本周总结",
    noFoodEntries: "暂无食物记录",
    startTrackingNutrition: "开始记录您的第一餐来追踪营养摄入。",
    todaysNutrition: "今日营养",
    calories: "卡路里",
    protein: "蛋白质",
    carbs: "碳水化合物",
    fat: "脂肪",
    fiber: "纤维",
    sodium: "钠",
    sugar: "糖",
    addFoodItem: "添加食物",
    searchFood: "搜索食物",
    servingSize: "份量",
    unit: "单位",
    meal: "餐次",
    breakfast: "早餐",
    lunch: "午餐",
    dinner: "晚餐", 
    snack: "零食",
    addToDiary: "添加到日记",
    foodAdded: "食物已添加",
    foodAddedDesc: "已添加到您的日记中。",
    selected: "已选择：",
    cal: "千卡",
    
    healthStatus: "健康状态",
    healthStatusSafe: "健康状态：安全",
    healthStatusCaution: "健康状态：注意",
    healthStatusAvoid: "健康状态：避免",
    noCriticalConflicts: "未发现严重冲突",
    somePotentialConcerns: "发现一些潜在问题",
    criticalConflictsDetected: "发现严重冲突",
    overallHealthScore: "综合健康评分",
    conflictDetection: "冲突检测",
    todaysNutritionProgress: "今日营养进度",
    weeklySummaryTitle: "周总结",
    weeklyAverages: "周平均值",
    foodVarietyScore: "食物多样性评分",
    daysTracked: "跟踪天数",
    weeklyInsights: "周洞察",
    aiWeeklyAnalysis: "周分析",
    healthRecommendations: "健康建议",
    tcmRecommendations: "中医健康建议",
    safeFoodsToday: "今日安全食品",
    allFoodsSafe: "今日摄入的所有食物与您的健康档案兼容",
    noConflictsDetected: "未检测到冲突",
    currentFoodChoicesSafe: "您当前的食物选择对您的健康档案是安全的",
    trackMoreMeals: "跟踪更多餐食以查看您的周总结",
    ofDailyGoal: "的每日目标",
    ofRecommendedIntake: "的推荐每日摄入量",
    seasonalBalance: "季节平衡",
    
    optimizeProteinIntake: "优化蛋白质摄入",
    increaseFiberIntake: "增加纤维摄入",
    reduceSodiumIntake: "减少钠摄入",
    bloodSugarManagement: "血糖管理",
    bloodPressureSupport: "血压支持",
    heartHealthyNutrition: "心脏健康营养",
    dietOptimization: "饮食优化",
    healthGoals: "健康目标",
    portionControl: "分量控制",
    currentIntake: "当前摄入量：",
    currentFiber: "当前纤维：",
    currentSodium: "当前钠：",
    todaysCarbs: "今日碳水：",
    todaysFat: "今日脂肪：",
    monitorSodiumIntake: "监测钠摄入量（今日：",
    
    loading: "加载中...",
    save: "保存",
    cancel: "取消",
    delete: "删除",
    edit: "编辑",
    close: "关闭",
    error: "错误",

    // Food deletion
    foodDeleted: "食物已删除",
    foodDeletedDesc: "已从您的日记中移除",
    failedToDeleteFood: "删除食物条目失败，请重试",

    // Food selection and adding
    noFoodSelected: "未选择食物",
    selectFoodFirst: "请先搜索并选择一个食物项目",
    failedToAddFood: "添加食物条目失败，请重试",

    piece: "个 (~100克)",
    cup: "杯 (~240克)",
    ounce: "盎司 (~28克)",
    tablespoon: "汤匙 (~15克)",
    teaspoon: "茶匙 (~5克)",
    gram: "克",
    g: '克',
    kg: '公斤',
    ml: '毫升',
    l: '升',
    
    vitaminC: "维生素C",
    vitaminA: "维生素A",
    vitaminK: "维生素K", 
    vitaminB6: "维生素B6",
    folate: "叶酸",
    potassium: "钾",
    magnesium: "镁",
    calcium: "钙",
    iron: "铁",
    balancedNutritionMessage: "您当前的营养摄入看起来很均衡。继续监测您的每日目标。",
    keepUpGoodWork: "继续保持！考虑增加蔬菜摄入的多样性。",
    balanceAndHarmonyMessage: "您当前的饮食选择支持整体平衡。考虑应季食物和正念饮食习惯以获得最佳健康。",

    // Alcohol
    alcohol: "酒精",

    // Conflict severity labels
    avoid: "避免",
    cautionRequired: "需要注意",

  }
};

// Translation cache for API results
interface TranslationCache {
  [key: string]: string;
}

class EnhancedTranslationBatcher {
  private static instance: EnhancedTranslationBatcher;
  private cache: TranslationCache = {};
  private pendingTranslations = new Map<string, Array<{
    resolve: (value: string) => void;
    reject: (error: Error) => void;
  }>>();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 100; // ms

  static getInstance() {
    if (!EnhancedTranslationBatcher.instance) {
      EnhancedTranslationBatcher.instance = new EnhancedTranslationBatcher();
    }
    return EnhancedTranslationBatcher.instance;
  }

  async translate(text: string, targetLanguage: string): Promise<string> {
    // Don't translate if target is English or text is empty
    if (targetLanguage === 'en' || !text.trim()) {
      return text;
    }

    const cacheKey = `${text}_${targetLanguage}`;
    
    // Return cached translation
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    // Return promise for pending/new translation
    return new Promise<string>((resolve, reject) => {
      if (!this.pendingTranslations.has(text)) {
        this.pendingTranslations.set(text, []);
      }
      
      this.pendingTranslations.get(text)!.push({ resolve, reject });
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
    const textsToTranslate = Array.from(this.pendingTranslations.keys());
    if (textsToTranslate.length === 0) return;

    try {
      // Use your existing Google Translate service
      const GOOGLE_TRANSLATE_API_KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;

      if (!GOOGLE_TRANSLATE_API_KEY) {
        console.warn('Translation API key not configured, falling back to original text');
        // Fallback: resolve with original text
        textsToTranslate.forEach((text) => {
          const pending = this.pendingTranslations.get(text) || [];
          pending.forEach(({ resolve }) => resolve(text));
          this.pendingTranslations.delete(text);
        });
        return;
      }

      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: textsToTranslate,
            target: targetLanguage,
            source: 'en',
          }),
        }
      );

      const data = await response.json();
      
      if (data.data?.translations) {
        // Process successful translations
        textsToTranslate.forEach((text, index) => {
          const translation = data.data.translations[index]?.translatedText || text;
          const cacheKey = `${text}_${targetLanguage}`;
          
          // Cache the translation
          this.cache[cacheKey] = translation;
          
          // Resolve all pending promises for this text
          const pending = this.pendingTranslations.get(text) || [];
          pending.forEach(({ resolve }) => resolve(translation));
          this.pendingTranslations.delete(text);
        });
      } else {
        throw new Error('Invalid translation response');
      }
    } catch (error) {
      console.warn('Batch translation failed:', error);
      
      // Fallback: resolve with original text
      textsToTranslate.forEach((text) => {
        const pending = this.pendingTranslations.get(text) || [];
        pending.forEach(({ resolve }) => resolve(text));
        this.pendingTranslations.delete(text);
      });
    }
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguageType>('en');
  const translationBatcher = useRef(EnhancedTranslationBatcher.getInstance());
  
  // Standard translation function - checks local first
  const t = useCallback((key: string, fallback?: string): string => {
    const localTranslation = translations[language][key as keyof typeof translations.en];
    return localTranslation || fallback || key;
  }, [language]);

  // Automatic translation for any text - uses API as backup
  const translateAuto = useCallback((text: string): string => {
    // First check if it's a known translation key
    const asKey = t(text);
    if (asKey !== text) {
      return asKey;
    }

    // For Chinese, translate via API (async, but component will re-render when ready)
    if (language === 'zh') {
      let translatedText = text;
      translationBatcher.current.translate(text, language).then((result) => {
        // This will trigger a re-render in components using this
        translatedText = result;
      });
      return translatedText;
    }

    return text;
  }, [language, t]);

  // Get nutrient info with fallback to API
  const getNutrientInfo = useCallback(async (nutrientName: string) => {
    // First check local data
    const localData = (nutrientData[language as Language] as NutrientDataByLanguage)?.[nutrientName];
    if (localData) return localData;

    // Fallback to API - you'll need to implement this endpoint
    try {
      const response = await fetch(`/api/nutrients/${nutrientName}?lang=${language}`);
      if (!response.ok) throw new Error('Nutrient not found');
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch nutrient info:', error);
      return null;
    }
  }, [language]);
  
  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      translateAuto, 
      getNutrientInfo 
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}