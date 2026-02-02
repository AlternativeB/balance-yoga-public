import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Plus,
} from "lucide-react";

// --- ТИПЫ ДАННЫХ ---
type Client = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  created_at: string;
};

type SubscriptionPlan = {
  id: string;
  name: string;
  price: number;
  sessions_count: number;
  duration_days: number;
};

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddSubOpen, setIsAddSubOpen] = useState(false);

  // 1. ПОЛУЧАЕМ ДАННЫЕ КЛИЕНТА
  const { data: client, isLoading: isClientLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Client;
    },
    enabled: !!id,
  });

  // 2. ПОЛУЧАЕМ АБОНЕМЕНТЫ ЭТОГО КЛИЕНТА
  const { data: subscriptions, isLoading: isSubsLoading } = useQuery({
    queryKey: ["client-subscriptions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select(`*, plan:plan_id (name)`)
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // 3. ПОЛУЧАЕМ СПИСОК АКТИВНЫХ ТАРИФОВ (ДЛЯ ВЫДАЧИ)
  const { data: plans } = useQuery({
    queryKey: ["active-plans"],
    queryFn: async () => {
      const { data } = await supabase.from("subscription_plans").select("*").eq("is_active", true);
      return data as SubscriptionPlan[];
    },
  });

  // Если грузится или клиент не найден
  if (isClientLoading) return <AdminLayout><div className="p-8">Загрузка карточки...</div></AdminLayout>;
  if (!client) return <AdminLayout><div className="p-8 text-red-500">Клиент не найден (ID: {id})</div></AdminLayout>;

  return (
    <AdminLayout>
      {/* Кнопка Назад */}
      <Button
        variant="ghost"
        className="mb-6 gap-2 -ml-2 text-muted-foreground hover:text-foreground"
        onClick={() => navigate("/clients")}
      >
        <ArrowLeft className="w-4 h-4" />
        Назад к списку
      </Button>

      {/* ШАПКА ПРОФИЛЯ */}
      <div className="page-header mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-semibold text-primary">
                {client.first_name?.[0] || "?"}{client.last_name?.[0] || ""}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{client.first_name} {client.last_name}</h1>
                <StatusBadge status="active" />
              </div>
              <p className="text-muted-foreground mt-1">
                Клиент с {new Date(client.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          {/* КНОПКА "ВЫДАТЬ АБОНЕМЕНТ" */}
          <Dialog open={isAddSubOpen} onOpenChange={setIsAddSubOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Выдать абонемент
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Новый абонемент</DialogTitle>
              </DialogHeader>
              <AddSubscriptionForm 
                  userId={client.id} 
                  plans={plans || []} 
                  onSuccess={() => {
                      setIsAddSubOpen(false);
                      queryClient.invalidateQueries({ queryKey: ["client-subscriptions"] });
                  }} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* СЕТКА КОНТЕНТА */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ЛЕВАЯ КОЛОНКА: ИНФО */}
        <div className="space-y-6">
            <Card>
            <CardHeader>
                <CardTitle className="text-base font-medium">Контакты</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{client.email || "—"}</p>
                </div>
                </div>
                <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Телефон</p>
                    <p className="text-sm font-medium">{client.phone || "—"}</p>
                </div>
                </div>
            </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium">Баланс занятий</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold text-primary">
                        {subscriptions?.reduce((acc, sub) => sub.is_active ? acc + sub.sessions_left : acc, 0) || 0}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Доступно по всем абонементам</p>
                </CardContent>
            </Card>
        </div>

        {/* ПРАВАЯ КОЛОНКА: СПИСКИ */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* ТАБЛИЦА АБОНЕМЕНТОВ */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <CreditCard className="h-4 w-4" /> Абонементы
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Тариф</TableHead>
                                <TableHead>Остаток</TableHead>
                                <TableHead>Годен до</TableHead>
                                <TableHead>Статус</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isSubsLoading && <TableRow><TableCell colSpan={4}>Загрузка...</TableCell></TableRow>}
                            {!isSubsLoading && subscriptions?.length === 0 && (
                                <TableRow><TableCell colSpan={4} className="text-center text-gray-500">Нет абонементов</TableCell></TableRow>
                            )}
                            {subscriptions?.map((sub) => (
                                <TableRow key={sub.id}>
                                    <TableCell className="font-medium">
                                        {sub.plan?.name || "Архивный тариф"}
                                        {sub.is_active_on_first_visit && !sub.activation_date && (
                                            <span className="block text-[10px] text-blue-500">Ждет 1-го посещения</span>
                                        )}
                                    </TableCell>
                                    <TableCell>{sub.sessions_left} зан.</TableCell>
                                    <TableCell>
                                        {sub.end_date 
                                            ? new Date(sub.end_date).toLocaleDateString() 
                                            : "—"}
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={sub.is_active ? "active" : "inactive"} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ИСТОРИЯ ПОСЕЩЕНИЙ (ЗАГЛУШКА) */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> История посещений
                    </CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed rounded-lg">
                        История посещений будет добавлена на следующем этапе
                     </div>
                </CardContent>
            </Card>

        </div>
      </div>
    </AdminLayout>
  );
};

// --- КОМПОНЕНТ ФОРМЫ (С ОТЛАДКОЙ) ---
const AddSubscriptionForm = ({ userId, plans, onSuccess }: { userId: string, plans: SubscriptionPlan[], onSuccess: () => void }) => {
    const [selectedPlanId, setSelectedPlanId] = useState<string>("");
    const [formData, setFormData] = useState({
        sessions_left: 0,
        price: 0,
        is_active_on_first_visit: true,
        days_valid: 30
    });

    const handlePlanChange = (planId: string) => {
        const plan = plans.find(p => p.id === planId);
        if (plan) {
            setSelectedPlanId(planId);
            setFormData({
                ...formData,
                sessions_left: plan.sessions_count,
                price: plan.price,
                days_valid: plan.duration_days
            });
        }
    };

    const mutation = useMutation({
        mutationFn: async () => {
            const now = new Date();
            let activationDate = null;
            let endDate = null;

            if (!formData.is_active_on_first_visit) {
                activationDate = now.toISOString();
                const end = new Date();
                end.setDate(end.getDate() + formData.days_valid);
                endDate = end.toISOString();
            }

            const { error } = await supabase.from("user_subscriptions").insert({
                user_id: userId,
                plan_id: selectedPlanId,
                sessions_left: formData.sessions_left,
                purchase_date: now.toISOString(),
                is_active_on_first_visit: formData.is_active_on_first_visit,
                activation_date: activationDate,
                end_date: endDate
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Абонемент успешно выдан!");
            onSuccess();
        },
        onError: (e) => toast.error("Ошибка: " + e.message)
    });

    return (
        <div className="space-y-4 py-4">
            
            {/* --- БЛОК ОТЛАДКИ (Если видите 0 - значит проблема в базе) --- */}
            <div className="bg-yellow-100 p-2 text-xs text-yellow-800 rounded mb-2">
                <b>Статус отладки:</b><br/>
                Загружено тарифов: {plans ? plans.length : "Загрузка..."}<br/>
                (Если тут 0, проверьте галочку "Активен" в админке)
            </div>
            {/* ----------------------------------------------------------- */}

            <div className="grid gap-2">
                <Label>Выберите тариф</Label>
                
                <Select onValueChange={handlePlanChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Нажмите для выбора..." />
                    </SelectTrigger>
                    
                    {/* Добавил z-[9999] и bg-white чтобы вытащить список наверх */}
                    <SelectContent className="z-[9999] bg-white border shadow-xl max-h-[300px]">
                        {plans && plans.length > 0 ? (
                            plans.map((plan) => (
                                <SelectItem key={plan.id} value={plan.id} className="cursor-pointer hover:bg-slate-100">
                                    {plan.name} — {plan.price.toLocaleString()} ₸
                                </SelectItem>
                            ))
                        ) : (
                            <div className="p-3 text-sm text-center text-gray-500">
                                Нет данных для отображения
                            </div>
                        )}
                    </SelectContent>
                </Select>
            </div>

            {selectedPlanId && (
                <div className="p-4 bg-slate-50 rounded-lg space-y-4 border text-sm">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-muted-foreground">Занятий</Label>
                            <Input 
                                type="number" 
                                value={formData.sessions_left} 
                                onChange={e => setFormData({...formData, sessions_left: Number(e.target.value)})} 
                            />
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Цена</Label>
                            <Input 
                                type="number" 
                                value={formData.price} 
                                onChange={e => setFormData({...formData, price: Number(e.target.value)})} 
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <Switch 
                            checked={formData.is_active_on_first_visit} 
                            onCheckedChange={c => setFormData({...formData, is_active_on_first_visit: c})} 
                        />
                        <div>
                            <Label>Активация при входе</Label>
                        </div>
                    </div>
                </div>
            )}

            <Button className="w-full" onClick={() => mutation.mutate()} disabled={!selectedPlanId || mutation.isPending}>
                {mutation.isPending ? "Обработка..." : "Подтвердить выдачу"}
            </Button>
        </div>
    );
};

export default ClientDetail;