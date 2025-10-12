import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Activity, BookOpen, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/language-context";

export function Dashboard() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('welcomeBack')}, {user?.firstName}!
          </h1>
          <p className="text-gray-600">
            {t('readyToTrack')}
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          {t('signOut')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm font-medium">{t('profile')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              {t('completeHealthProfile')}
            </CardDescription>
            <Link href="/health">
              <Button className="mt-2 w-full">
                {t('updateHealthProfile')}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-green-600" />
              <CardTitle className="text-sm font-medium">{t('foodDiary')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              {t('logMealsTrackNutrition')}
            </CardDescription>
            <Link href="/diary">
              <Button className="mt-2 w-full">
                {t('openFoodDiary')}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <CardTitle className="text-sm font-medium">{t('insights')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              {t('viewHealthTrends')}
            </CardDescription>
            <Link href="/insights">
              <Button className="mt-2 w-full">
                {t('viewInsights')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}