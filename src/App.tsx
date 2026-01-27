import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";

// Страницы
import Login from "./pages/Login";
import Index from "./pages/Index";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Schedule from "./pages/Schedule";
import Subscriptions from "./pages/Subscriptions";
import Attendance from "./pages/Attendance";
import Instructors from "./pages/Instructors";
import Trials from "./pages/Trials";
import Aggregators from "./pages/Aggregators";
import News from "./pages/News";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import SubscriptionPlans from "./pages/SubscriptionPlans";
import ClientPricing from "./pages/portal/ClientPricing";

import ClientLogin from "./pages/portal/ClientLogin";
import ClientHome from "./pages/portal/ClientHome";
import ClientSchedule from "./pages/portal/ClientSchedule";
import ClientInstructors from "./pages/portal/ClientInstructors";
import ClientProfile from "./pages/portal/ClientProfile";

const queryClient = new QueryClient();

// Умный охранник (с кнопкой спасения)
const ProtectedRoute = ({ children, checkAdmin = false }: { children: React.ReactNode, checkAdmin?: boolean }) => {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [showRescueButton, setShowRescueButton] = useState(false);

  useEffect(() => {
    // Если через 3 секунды все еще грузится - показываем кнопку
    const timer = setTimeout(() => setShowRescueButton(true), 3000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user.email && checkAdmin) {
        checkAdminStatus(session.user.email);
      } else {
        setIsAdmin(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user.email && checkAdmin) {
        checkAdminStatus(session.user.email);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [checkAdmin]);

  const checkAdminStatus = async (email: string) => {
    try {
      const { data } = await supabase.from('app_admins').select('id').eq('email', email).maybeSingle();
      setIsAdmin(!!data);
    } catch (e) {
      console.error("Ошибка проверки админа:", e);
      setIsAdmin(false); // В случае ошибки сети считаем, что не админ, чтобы не висело
    }
  };

  // 1. Состояние загрузки
  if (session === undefined || (checkAdmin && session && isAdmin === null)) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <p className="text-gray-500">Загрузка...</p>
        
        {showRescueButton && (
          <div className="flex flex-col gap-2 items-center animate-in fade-in">
             <p className="text-red-500 text-sm">Долго грузится?</p>
             <button 
               onClick={() => window.location.href = '/login'}
               className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-700 text-sm"
             >
               Сбросить и войти заново
             </button>
          </div>
        )}
      </div>
    );
  }

  // 2. Нет сессии -> На выход
  if (session === null) {
    return <Navigate to={checkAdmin ? "/login" : "/portal/login"} replace />;
  }

  // 3. Если нужна проверка админа, но юзер не админ
  if (checkAdmin && !isAdmin) {
    return (
        <div className="h-screen flex flex-col items-center justify-center p-4 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Доступ запрещен</h1>
            <p className="mb-4">Ваш Email ({session.user.email}) не найден в списке администраторов.</p>
            <button onClick={() => supabase.auth.signOut()} className="underline">Выйти</button>
        </div>
    );
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/portal/login" element={<ClientLogin />} />

          {/* АДМИНКА */}
          <Route path="/" element={<ProtectedRoute checkAdmin><Index /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute checkAdmin><Clients /></ProtectedRoute>} />
          <Route path="/clients/:id" element={<ProtectedRoute checkAdmin><ClientDetail /></ProtectedRoute>} />
          <Route path="/schedule" element={<ProtectedRoute checkAdmin><Schedule /></ProtectedRoute>} />
          <Route path="/subscriptions" element={<ProtectedRoute checkAdmin><Subscriptions /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute checkAdmin><Attendance /></ProtectedRoute>} />
          <Route path="/instructors" element={<ProtectedRoute checkAdmin><Instructors /></ProtectedRoute>} />
          <Route path="/trials" element={<ProtectedRoute checkAdmin><Trials /></ProtectedRoute>} />
          <Route path="/aggregators" element={<ProtectedRoute checkAdmin><Aggregators /></ProtectedRoute>} />
          <Route path="/news" element={<ProtectedRoute checkAdmin><News /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute checkAdmin><Settings /></ProtectedRoute>} />
          <Route path="/admin/plans" element={<ProtectedRoute checkAdmin><SubscriptionPlans /></ProtectedRoute>} />

          {/* КЛИЕНТСКАЯ ЧАСТЬ */}
          <Route path="/portal" element={<ProtectedRoute><ClientHome /></ProtectedRoute>} />
          <Route path="/portal/schedule" element={<ProtectedRoute><ClientSchedule /></ProtectedRoute>} />
          <Route path="/portal/instructors" element={<ProtectedRoute><ClientInstructors /></ProtectedRoute>} />
          <Route path="/portal/profile" element={<ProtectedRoute><ClientProfile /></ProtectedRoute>} />
          <Route path="/portal/pricing" element={<ProtectedRoute><ClientPricing /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;