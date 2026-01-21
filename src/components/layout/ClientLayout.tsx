import { Link, useLocation } from "react-router-dom";
import { Home, Calendar, User, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export const ClientLayout = ({ children }: ClientLayoutProps) => {
  const location = useLocation();

  const navItems = [
    { name: "Главная", href: "/portal", icon: Home },
    { name: "Расписание", href: "/portal/schedule", icon: Calendar },
    { name: "Тренеры", href: "/portal/instructors", icon: Dumbbell },
    { name: "Профиль", href: "/portal/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Контентная часть */}
      <main className="max-w-md mx-auto min-h-screen bg-white shadow-xl overflow-hidden pb-20 relative">
        <div className="p-4 h-full overflow-y-auto">
           {children}
        </div>
      </main>

      {/* Нижнее меню (Fixed Bottom Navigation) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 transition-all active:scale-95 w-16",
                isActive ? "text-primary" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <item.icon className={cn("w-6 h-6", isActive && "fill-primary/20 text-primary")} strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn("text-[10px] font-medium", isActive && "text-primary")}>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};