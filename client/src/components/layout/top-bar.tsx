import { Heart, Bell, User, Languages } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TopBar() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="bg-primary-custom text-white p-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Heart className="text-primary-custom text-lg" />
          </div>
          <h1 className="text-xl font-semibold">{t('appTitle')}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="text-white opacity-80 hover:opacity-100 transition-opacity">
              <div className="flex items-center space-x-1">
                <Languages className="w-5 h-5" />
                <span className="text-sm">{language.toUpperCase()}</span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem 
                onClick={() => setLanguage('en')}
                className={language === 'en' ? 'bg-gray-100' : ''}
              >
                🇺🇸 English
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLanguage('zh')}
                className={language === 'zh' ? 'bg-gray-100' : ''}
              >
                🇨🇳 中文
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Bell className="text-white opacity-80 w-5 h-5" />
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <User className="text-white text-sm w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
