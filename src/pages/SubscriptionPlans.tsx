import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const SubscriptionPlans = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  // Получаем планы
  const { data: plans, isLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Удаление
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Тариф удален");
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    },
    onError: (error) => {
        toast.error("Ошибка удаления: " + error.message);
    }
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">Виды абонементов</h1>
            <p className="text-gray-500">Настройте прайс-лист для клиентов</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPlan(null)}>
              <Plus className="mr-2 h-4 w-4" /> Добавить тариф
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Редактировать тариф" : "Новый тариф"}</DialogTitle>
            </DialogHeader>
            <PlanForm 
              initialData={editingPlan} 
              onSuccess={() => { setIsOpen(false); queryClient.invalidateQueries({ queryKey: ["subscription-plans"] }); }} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div>Загрузка...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans?.map((plan) => (
            <Card key={plan.id} className={!plan.is_active ? "opacity-60 border-dashed" : "border-primary/20 shadow-sm"}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                <div className="flex gap-1">
                   <Button variant="ghost" size="icon" onClick={() => { setEditingPlan(plan); setIsOpen(true); }}>
                      <Edit className="h-4 w-4" />
                   </Button>
                   <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => {
                       if(confirm("Удалить этот тариф?")) deleteMutation.mutate(plan.id);
                   }}>
                      <Trash2 className="h-4 w-4" />
                   </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4 text-primary">{plan.price.toLocaleString()} ₸</div>
                <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between border-b pb-1">
                        <span>Занятий:</span> <span className="font-semibold">{plan.sessions_count}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span>Срок действия:</span> <span className="font-semibold">{plan.duration_days} дней</span>
                    </div>
                    {plan.description && <p className="pt-2 italic text-gray-500">{plan.description}</p>}
                    
                    {plan.features && plan.features.length > 0 && (
                        <div className="pt-2 space-y-1">
                            {plan.features.map((f: string, i: number) => (
                                <div key={i} className="flex items-center text-xs">
                                    <Check className="h-3 w-3 text-green-500 mr-1" /> {f}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
              </CardContent>
            </Card>
          ))}
          {plans?.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-400">
                  Нет созданных тарифов. Нажмите "Добавить тариф".
              </div>
          )}
        </div>
      )}
    </div>
  );
};

const PlanForm = ({ initialData, onSuccess }: { initialData?: any, onSuccess: () => void }) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        price: initialData?.price || "",
        sessions_count: initialData?.sessions_count || "",
        duration_days: initialData?.duration_days || 30,
        description: initialData?.description || "",
        features: initialData?.features ? initialData.features.join('\n') : "", 
        is_active: initialData?.is_active ?? true
    });

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const formattedData = {
                ...data,
                // Преобразуем строки в числа и массив
                price: Number(data.price),
                sessions_count: Number(data.sessions_count),
                duration_days: Number(data.duration_days),
                features: data.features.split('\n').filter((f: string) => f.trim() !== "")
            };

            if (initialData?.id) {
                const { error } = await supabase.from("subscription_plans").update(formattedData).eq("id", initialData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("subscription_plans").insert(formattedData);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast.success(initialData ? "Обновлено" : "Создано");
            onSuccess();
        },
        onError: (error) => {
            toast.error("Ошибка: " + error.message);
        }
    });

    return (
        <div className="space-y-4 py-4">
            <div className="grid gap-2">
                <Label>Название тарифа</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Например: 8 занятий" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Цена (₸)</Label>
                    <Input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
                <div className="grid gap-2">
                    <Label>Кол-во занятий</Label>
                    <Input type="number" value={formData.sessions_count} onChange={e => setFormData({...formData, sessions_count: e.target.value})} />
                </div>
            </div>
             <div className="grid gap-2">
                <Label>Срок действия (дней)</Label>
                <Input type="number" value={formData.duration_days} onChange={e => setFormData({...formData, duration_days: e.target.value})} />
            </div>
            <div className="grid gap-2">
                <Label>Описание (видно клиенту)</Label>
                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Краткое описание" />
            </div>
            <div className="grid gap-2">
                <Label>Преимущества (каждое с новой строки)</Label>
                <Textarea className="h-24" value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})} placeholder="Полотенце бесплатно&#10;Заморозка 7 дней&#10;Гостевой визит" />
            </div>
            <div className="flex items-center space-x-2 border p-3 rounded-md">
                <Switch checked={formData.is_active} onCheckedChange={c => setFormData({...formData, is_active: c})} />
                <Label>Активен (Показывать в приложении?)</Label>
            </div>
            <Button className="w-full" onClick={() => mutation.mutate(formData)} disabled={mutation.isPending}>
                {mutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
        </div>
    )
}

export default SubscriptionPlans;