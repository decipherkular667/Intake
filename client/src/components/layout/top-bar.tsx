import { Heart, Bell, User } from "lucide-react";

export default function TopBar() {
  return (
    <header className="bg-primary-custom text-white p-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Heart className="text-primary-custom text-lg" />
          </div>
          <h1 className="text-xl font-semibold">IntakeAI</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Bell className="text-white opacity-80 w-5 h-5" />
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <User className="text-white text-sm w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
