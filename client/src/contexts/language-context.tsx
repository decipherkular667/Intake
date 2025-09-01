import { createContext, useContext, useState, ReactNode } from "react";

type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // App Title
    appTitle: "IntakeAI",
    
    // Navigation
    health: "Health",
    diary: "Food Diary", 
    insights: "Insights",
    
    // Health Survey
    healthProfile: "Health Profile",
    personalInfo: "Personal Information",
    name: "Name",
    birthYear: "Birth Year",
    birthMonth: "Birth Month",
    weight: "Weight (kg)",
    height: "Height (cm)",
    allergies: "Allergies",
    medicalConditions: "Medical Conditions",
    smokingStatus: "Smoking Status",
    never: "Never",
    former: "Former",
    current: "Current",
    saveProfile: "Save Profile",
    profileSaved: "Profile saved successfully!",
    
    // Food Diary
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
    cal: "cal",
    
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
    aiWeeklyAnalysis: "AI Weekly Analysis",
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
  },
  zh: {
    // App Title
    appTitle: "营养智能",
    
    // Navigation
    health: "健康",
    diary: "饮食日记",
    insights: "健康洞察",
    
    // Health Survey
    healthProfile: "健康档案",
    personalInfo: "个人信息",
    name: "姓名",
    birthYear: "出生年份",
    birthMonth: "出生月份",
    weight: "体重 (公斤)",
    height: "身高 (厘米)",
    allergies: "过敏症",
    medicalConditions: "疾病史",
    smokingStatus: "吸烟状况",
    never: "从不吸烟",
    former: "曾经吸烟",
    current: "目前吸烟",
    saveProfile: "保存档案",
    profileSaved: "档案保存成功！",
    
    // Food Diary
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
    cal: "卡",
    
    // Insights
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
    weeklySummary: "周总结",
    weeklyAverages: "周平均值",
    foodVarietyScore: "食物多样性评分",
    daysTracked: "跟踪天数",
    weeklyInsights: "周洞察",
    aiWeeklyAnalysis: "AI周分析",
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
    
    // Recommendations
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
    
    // Common
    loading: "加载中...",
    save: "保存",
    cancel: "取消",
    delete: "删除",
    edit: "编辑",
    close: "关闭",
    error: "错误",
    
    // Units
    piece: "个 (~100克)",
    cup: "杯 (~240克)",
    ounce: "盎司 (~28克)",
    tablespoon: "汤匙 (~15克)",
    teaspoon: "茶匙 (~5克)",
    gram: "克",
    
    // Nutrients
    vitaminC: "维生素C",
    vitaminA: "维生素A",
    vitaminK: "维生素K", 
    vitaminB6: "维生素B6",
    folate: "叶酸",
    potassium: "钾",
    magnesium: "镁",
    calcium: "钙",
    iron: "铁",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  
  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key;
  };
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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