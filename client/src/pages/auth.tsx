import { useState } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { t, language, setLanguage } = useLanguage();

  // Redirect if already authenticated
  if (isAuthenticated) {
    setLocation("/dashboard");
    return null;
  }

  // Show loading while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const handleAuthSuccess = () => {
    // Navigation will be handled by the redirect above
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Language Selector */}
        <div className="flex justify-center mb-6">
          <div className="flex space-x-2">
            <Button
              variant={language === 'en' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLanguage('en')}
            >
              English
            </Button>
            <Button
              variant={language === 'zh' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLanguage('zh')}
            >
              中文
            </Button>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('welcomeTitle')}
          </h1>
          <p className="text-gray-600">
            {t('welcomeSubtitle')}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {isLogin ? (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onRegisterClick={() => setIsLogin(false)}
          />
        ) : (
          <RegisterForm
            onSuccess={handleAuthSuccess}
            onLoginClick={() => setIsLogin(true)}
          />
        )}
      </div>
    </div>
  );
}