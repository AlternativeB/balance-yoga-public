import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ClientPricing = () => {
  const navigate = useNavigate();
  
  const { data: plans, isLoading } = useQuery({
    queryKey: ["public-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Загрузка тарифов...</div>;

  return (
    <div className="bg-gray-50 min-h-screen pb-20 animate-in fade-in">
      {/* Заголовок */}
      <div className="bg-white py-8 px-4 text-center border-b sticky top-0 z-10 shadow-sm">
         <div className="flex items-center justify-between max-w-5xl mx-auto mb-4">
             <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                 <ArrowLeft className="h-6 w-6" />
             </Button>
             <h1 className="text-xl font-bold">Абонементы</h1>
             <div className="w-6"></div> {/* Пустышка для центровки */}
         </div>
        <p className="text-gray-500 text-sm">Инвестируйте в свое здоровье и баланс</p>
      </div>

      {/* Сетка тарифов */}
      <div className="max-w-md mx-auto md:max-w-5xl p-4">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans?.map((plan) => (
            <div key={plan.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col relative">
              {/* Бейдж популярного (можно доработать логику) */}
              {plan.sessions_count === 12 && (
                  <div className="absolute top-0 right-0 bg-primary text-white text-xs px-3 py-1 rounded-bl-xl font-bold">
                      ХИТ
                  </div>
              )}
              
              <div className="p-6 flex-grow">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-xs text-gray-400 mb-4 uppercase tracking-wider">{plan.duration_days} ДНЕЙ ДЕЙСТВИЯ</p>
                
                <div className="flex items-baseline gap-1 mb-6 border-b border-dashed pb-6">
                  <span className="text-3xl font-extrabold text-gray-900">{plan.price.toLocaleString()} ₸</span>
                  <span className="text-sm text-gray-400">/ {plan.sessions_count} зан.</span>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">{plan.description}</p>

                <div className="space-y-3">
                  {plan.features?.map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-start text-sm text-gray-600">
                      <div className="bg-green-100 rounded-full p-0.5 mr-2 mt-0.5">
                        <Check className="h-3 w-3 text-green-700" />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50/50 mt-auto">
                 <Button className="w-full h-12 rounded-xl text-base font-semibold shadow-lg hover:shadow-xl transition-all" onClick={() => toast.success("Заявка отправлена администратору!")}>
                    Выбрать этот тариф
                 </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
import { toast } from "sonner"; // Импорт для кнопки

export default ClientPricing;