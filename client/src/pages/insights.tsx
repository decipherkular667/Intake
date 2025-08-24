import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Shield, TrendingUp, Brain, Target, Lightbulb, Wind } from "lucide-react";
import { useInsights } from "@/hooks/use-insights";

export default function Insights() {
  const { insights, isLoading } = useInsights();

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
      title: "Health Status: Safe",
      description: "No critical conflicts detected",
    },
    caution: {
      bg: "bg-gradient-to-r from-yellow-500 to-yellow-600",
      icon: Shield,
      title: "Health Status: Caution",
      description: "Some potential concerns identified",
    },
    avoid: {
      bg: "bg-gradient-to-r from-red-500 to-red-600",
      icon: Shield,
      title: "Health Status: Avoid",
      description: "Critical conflicts detected",
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

        {/* Weekly Summary */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="text-secondary-custom mr-2" />
              Weekly Summary
            </h3>
            
            {/* Calorie Chart */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Daily Calories</span>
                <span className="text-sm text-gray-500">Target: 2000</span>
              </div>
              <div className="space-y-2" data-testid="weekly-calories">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => {
                  const calories = [1847, 1923, 2156, 1876, 2045, 1992, 1765][index];
                  const percentage = (calories / 2000) * 100;
                  return (
                    <div key={day} className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 w-12">{day}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full ${percentage > 100 ? 'bg-warning-custom' : 'bg-primary-custom'}`}
                          style={{width: `${Math.min(100, percentage)}%`}}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-800 w-16">{calories}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Macro Distribution */}
            <div className="grid grid-cols-3 gap-4" data-testid="macro-distribution">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">45%</div>
                <div className="text-sm text-blue-600">Carbs</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">25%</div>
                <div className="text-sm text-green-600">Protein</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-700">30%</div>
                <div className="text-sm text-orange-600">Fat</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Brain className="text-purple-600 mr-2" />
              AI Recommendations
            </h3>
            
            <div className="space-y-4" data-testid="recommendations-list">
              {/* Display actual recommendations */}
              {insights?.recommendations && (insights.recommendations as any[]).map((rec, index) => {
                const typeConfig = {
                  diet: { bg: "bg-purple-50", icon: Lightbulb, color: "text-purple-800" },
                  tcm: { bg: "bg-indigo-50", icon: Wind, color: "text-indigo-800" },
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
              
              {/* Default recommendations if none exist */}
              {(!insights?.recommendations || (insights.recommendations as any[]).length === 0) && (
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
      </div>
    </div>
  );
}
