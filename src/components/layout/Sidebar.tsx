import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Home, 
  Users, 
  Calendar, 
  CreditCard, 
  ClipboardCheck, 
  UserCog, 
  Settings, 
  LogOut, 
  Megaphone,
  Percent,
  Globe
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

// ДОБАВИЛИ "export" ПЕРЕД const
export const Sidebar = () => {
  const location = useLocation();

  const navigation = [
    { name: "Главная", href: "/", icon: Home },
    { name: "Клиенты", href: "/clients", icon: Users },
    { name: "Расписание", href: "/schedule", icon: Calendar },
    { name: "Абонементы", href: "/subscriptions", icon: CreditCard },
    { name: "Посещаемость", href: "/attendance", icon: ClipboardCheck },
    { name: "Инструкторы", href: "/instructors", icon: UserCog },
    { name: "Новости", href: "/news", icon: Megaphone },
    { name: "Пробные", href: "/trials", icon: Percent },
    { name: "Агрегаторы", href: "/aggregators", icon: Globe },
    { name: "Настройки", href: "/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="h-screen w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0 border-r border-slate-800">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
          StudioFlow
        </h1>
        <p className="text-xs text-slate-400 mt-1">Панель управления</p>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                isActive
                  ? "bg-primary text-white shadow-lg shadow-primary/20 translate-x-1"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20 gap-3"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          Выйти
        </Button>
      </div>
    </div>
  );
};
// СТРОКУ "export default Sidebar" УБРАЛИ