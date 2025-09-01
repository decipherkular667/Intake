import { Heart, Book, PieChart } from "lucide-react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/language-context";

export default function BottomNavigation() {
  const [location] = useLocation();
  const { t } = useLanguage();

  const isActive = (path: string) => {
    if (path === "/" || path === "/health") {
      return location === "/" || location === "/health";
    }
    return location === path;
  };

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-4 py-2 z-50">
      <div className="flex items-center justify-around">
        <Link href="/health">
          <button 
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              isActive("/health") 
                ? "bg-primary-custom/10 text-primary-custom" 
                : "text-gray-500 hover:text-gray-700"
            }`}
            data-testid="nav-health"
          >
            <Heart className="text-xl mb-1 w-6 h-6" />
            <span className="text-xs font-medium">{t('health')}</span>
          </button>
        </Link>
        
        <Link href="/diary">
          <button 
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              isActive("/diary") 
                ? "bg-primary-custom/10 text-primary-custom" 
                : "text-gray-500 hover:text-gray-700"
            }`}
            data-testid="nav-diary"
          >
            <Book className="text-xl mb-1 w-6 h-6" />
            <span className="text-xs font-medium">{t('diary')}</span>
          </button>
        </Link>
        
        <Link href="/insights">
          <button 
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              isActive("/insights") 
                ? "bg-primary-custom/10 text-primary-custom" 
                : "text-gray-500 hover:text-gray-700"
            }`}
            data-testid="nav-insights"
          >
            <PieChart className="text-xl mb-1 w-6 h-6" />
            <span className="text-xs font-medium">{t('insights')}</span>
          </button>
        </Link>
      </div>
    </nav>
  );
}
