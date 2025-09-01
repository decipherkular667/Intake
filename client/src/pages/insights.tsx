import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Shield, TrendingUp, Brain, Target, Lightbulb, Wind } from "lucide-react";
import { useInsights } from "@/hooks/use-insights";
import { formatNumber, formatWithUnit } from "@/lib/format-number";
import { useLanguage } from "@/contexts/language-context";

export default function Insights() {
  const { insights, isLoading } = useInsights();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="px-4 mt-4 space-y-6">
        <div className="bg-gray-100 animate-pulse h-32 rounded-xl"></div>
        <div className="bg-gray-100 animate-pulse h-48 rounded-xl"></div>
        <div className="bg-gray-100 animate-pulse h-64 rounded-xl"></div>
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
              <p className="text-green-100 text-sm">{currentStatus.description}</p>
            </div>
          </div>
          <div className="bg-white/20 rounded-lg p-3 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Health Score</span>
              <span className="font-semibold" data-testid="health-score">
                {insights?.healthScore || 8}/10
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Conflict Detection */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="text-primary-custom mr-2" />
              Conflict Detection
            </h3>
            
            <div className="space-y-3" data-testid="conflicts-list">
              {/* Safe Items */}
              <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="text-green-600 w-5 h-5" />
                  <span className="font-medium text-green-800">✅ Safe Foods Today</span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  All food items consumed are compatible with your health profile
                </p>
              </div>
              
              {/* Display actual conflicts */}
              {insights?.conflicts && (insights.conflicts as any[]).map((conflict, index) => {
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
                        {conflict.severity === "high" ? "Avoid" : "Caution Required"}
                      </span>
                    </div>
                    <p className={`${config.text} text-sm mt-1`}>{conflict.description}</p>
                  </div>
                );
              })}
              
              {/* Show default message if no conflicts */}
              {(!insights?.conflicts || (insights.conflicts as any[]).length === 0) && (
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="text-green-600 w-5 h-5" />
                    <span className="font-medium text-green-800">✅ No Conflicts Detected</span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    Your current food choices are safe with your health profile
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Nutrient Progress */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Target className="text-primary-custom mr-2" />
              Today's Nutrition Progress
            </h3>
            
            {/* Daily Nutrition Progress with Real Data */}
            {(() => {
              const dailyTotals = (insights as any)?.dailyTotals || {
                calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, sugar: 0
              };
              
              // Daily targets
              const targets = {
                calories: 2000,
                protein: 60,
                carbs: 250,
                fiber: 25,
                sodium: 2300
              };

              const progress = {
                calories: { current: formatNumber(dailyTotals.calories, 0), target: targets.calories },
                protein: { current: formatNumber(dailyTotals.protein), target: targets.protein },
                carbs: { current: formatNumber(dailyTotals.carbs), target: targets.carbs },
                fiber: { current: formatNumber(dailyTotals.fiber), target: targets.fiber }
              };

              return (
                <div className="space-y-4">
                  {Object.entries(progress).map(([nutrient, data]) => {
                    const percentage = Math.min(100, (data.current / data.target) * 100);
                    const color = percentage >= 80 ? 'bg-green-500' : 
                                percentage >= 50 ? 'bg-yellow-500' : 'bg-red-400';
                    const bgColor = percentage >= 80 ? 'bg-green-50' : 
                                   percentage >= 50 ? 'bg-yellow-50' : 'bg-red-50';
                    const textColor = percentage >= 80 ? 'text-green-700' : 
                                     percentage >= 50 ? 'text-yellow-700' : 'text-red-700';
                    
                    return (
                      <div key={nutrient} className={`p-4 rounded-lg ${bgColor}`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className={`font-medium ${textColor} capitalize`}>{nutrient}</span>
                          <span className={`text-sm ${textColor}`}>
                            {formatNumber(data.current, 0)}/{formatNumber(data.target, 0)}{nutrient === 'calories' ? '' : 'g'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${color} transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className={`text-xs ${textColor} mt-1`}>
                          {formatNumber(percentage, 0)}% of daily goal
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Weekly Summary - Dynamic */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="text-secondary-custom mr-2" />
              {insights?.weeklySummary?.period || "Weekly Summary"}
            </h3>
            
            {insights?.weeklySummary ? (
              <>
                {/* Weekly Nutrient Progress Bars */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-3">Weekly Averages</h4>
                  {(() => {
                    const weeklyTargets = {
                      calories: 2000,
                      protein: 60,
                      carbs: 250,
                      fat: 65
                    };

                    const weeklyData = [
                      { name: 'Calories', current: insights.weeklySummary.calories, target: weeklyTargets.calories, unit: '' },
                      { name: 'Protein', current: insights.weeklySummary.protein, target: weeklyTargets.protein, unit: 'g' },
                      { name: 'Carbs', current: insights.weeklySummary.carbs, target: weeklyTargets.carbs, unit: 'g' },
                      { name: 'Fat', current: insights.weeklySummary.fat, target: weeklyTargets.fat, unit: 'g' }
                    ];

                    return (
                      <div className="space-y-3">
                        {weeklyData.map((item) => {
                          const percentage = Math.min(100, (item.current / item.target) * 100);
                          const color = percentage >= 80 ? 'bg-blue-500' : 
                                       percentage >= 50 ? 'bg-purple-500' : 'bg-gray-400';
                          
                          return (
                            <div key={item.name} className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-gray-700">{item.name}</span>
                                <span className="text-sm text-gray-600">
                                  {formatNumber(item.current, 0)}{item.unit} / {formatNumber(item.target, 0)}{item.unit}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${color} transition-all duration-500`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {formatNumber(percentage, 0)}% of recommended daily intake
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Weekly Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-indigo-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-indigo-700">{insights.weeklySummary.variety}/10</div>
                    <div className="text-sm text-indigo-600">Food Variety Score</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-700">{insights.weeklySummary.daysTracked}</div>
                    <div className="text-sm text-green-600">Days Tracked</div>
                  </div>
                </div>

                {/* AI Analysis & Insights */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800">Weekly Insights</h4>
                  {insights.weeklySummary.insights?.map((insight: string, index: number) => (
                    <div key={index} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      <p className="text-blue-800 text-sm">{insight}</p>
                    </div>
                  ))}
                  
                  {insights.weeklySummary.aiAnalysis && (
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                      <h5 className="font-medium text-purple-800 mb-2 flex items-center">
                        <Brain className="w-4 h-4 mr-1" />
                        AI Weekly Analysis
                      </h5>
                      <p className="text-purple-700 text-sm">{insights.weeklySummary.aiAnalysis}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center p-8 text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Track more meals to see your weekly summary</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Health Recommendations */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Lightbulb className="text-purple-600 mr-2" />
              Health Recommendations
            </h3>
            
            <div className="space-y-4" data-testid="health-recommendations-list">
              {/* Display diet and lifestyle recommendations */}
              {insights?.recommendations && (insights.recommendations as any[])
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
                      {rec.title}
                    </h4>
                    <p className={`${config.color} text-sm`}>{rec.description}</p>
                    {rec.priority && (
                      <Badge 
                        variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "default" : "secondary"}
                        className="mt-2"
                      >
                        {rec.priority} priority
                      </Badge>
                    )}
                  </div>
                );
              })}
              
              {/* Default health recommendations if none exist */}
              {(!insights?.recommendations || 
                (insights.recommendations as any[]).filter((rec: any) => rec.type === "diet" || rec.type === "lifestyle").length === 0) && (
                <>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-800 mb-2 flex items-center">
                      <Lightbulb className="w-4 h-4 mr-1" />
                      Diet Optimization
                    </h4>
                    <p className="text-purple-700 text-sm">
                      Your current nutrition intake looks balanced. Continue monitoring your daily goals.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2 flex items-center">
                      <Target className="w-4 h-4 mr-1" />
                      Health Goals
                    </h4>
                    <p className="text-green-700 text-sm">
                      Keep up the good work! Consider adding more variety to your vegetable intake.
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Traditional Chinese Medicine Health Recommendations */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Wind className="text-indigo-600 mr-2" />
              Traditional Chinese Medicine Health Recommendations
            </h3>
            
            <div className="space-y-4" data-testid="tcm-recommendations-list">
              {/* Display TCM recommendations */}
              {insights?.recommendations && (insights.recommendations as any[])
                .filter((rec: any) => rec.type === "tcm")
                .map((rec, index) => (
                  <div key={index} className="p-4 bg-indigo-50 rounded-lg">
                    <h4 className="font-medium text-indigo-800 mb-2 flex items-center">
                      <Wind className="w-4 h-4 mr-1" />
                      {rec.title}
                    </h4>
                    <p className="text-indigo-800 text-sm">{rec.description}</p>
                    {rec.priority && (
                      <Badge 
                        variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "default" : "secondary"}
                        className="mt-2"
                      >
                        {rec.priority} priority
                      </Badge>
                    )}
                  </div>
                ))}
              
              {/* Default TCM recommendations if none exist */}
              {(!insights?.recommendations || 
                (insights.recommendations as any[]).filter((rec: any) => rec.type === "tcm").length === 0) && (
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <h4 className="font-medium text-indigo-800 mb-2 flex items-center">
                    <Wind className="w-4 h-4 mr-1" />
                    Balance and Harmony
                  </h4>
                  <p className="text-indigo-700 text-sm">
                    Your current dietary choices support overall balance. Consider seasonal foods and mindful eating practices for optimal health.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
