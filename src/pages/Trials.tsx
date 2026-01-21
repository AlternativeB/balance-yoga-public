import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { UserPlus, Loader2, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const Trials = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    price: "2000" // Цена пробного
  });

  // 1. ПОКАЗЫВАЕМ ТЕХ, КТО КУПИЛ ПРОБНОЕ (За последние 30 дней)
  const { data: trialUsers = [], isLoading } = useQuery({
    queryKey: ['trial_users'],
    queryFn: async () => {
      // Ищем абонементы с названием "Пробное"
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`*, clients(first_name, last_name, phone)`)
        .ilike('type', '%Пробное%') 
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    }
  });

  // 2. БЫСТРАЯ РЕГИСТРАЦИЯ
  const registerTrialMutation = useMutation({
    mutationFn: async () => {
      // А. Создаем Клиента
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert([{
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          source: 'Пробное',
          status: 'active'
        }])
        .select()
        .single();

      if (clientError) throw clientError;

      // Б. Выдаем ему абонемент "Пробное" (на 1 день, 1 занятие)
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert([{
          client_id: clientData.id,
          type: "Пробное занятие",
          start_date: new Date().toISOString(),
          end_date: new Date().toISOString(), // Только сегодня
          sessions_total: 1,
          sessions_remaining: 1,
          price: parseInt(form.price),
          status: 'active'
        }]);

      if (subError) throw subError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial_users'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] }); // Обновить и общий список
      setIsDialogOpen(false);
      setForm({ first_name: "", last_name: "", phone: "", price: "2000" });
      toast({ title: "Готово!", description: "Клиент создан, пробное начислено." });
    },
    onError: (err) => alert(err.message)
  });

  const columns = [
    {
      key: "name",
      header: "Клиент",
      render: (item: any) => (
        <span className="font-medium">
          {item.clients?.first_name} {item.clients?.last_name}
        </span>
      )
    },
    {
      key: "phone",
      header: "Телефон",
      render: (item: any) => <span className="font-mono text-xs">{item.clients?.phone}</span>
    },
    {
      key: "date",
      header: "Дата покупки",
      render: (item: any) => <span className="text-muted-foreground">{format(new Date(item.created_at), "dd.MM.yyyy")}</span>
    },
    {
      key: "status",
      header: "Статус",
      render: (item: any) => (
         // Если остаток 0 - значит сходил
         item.sessions_remaining === 0 
           ? <span className="text-green-600 flex items-center gap-1 text-xs bg-green-50 px-2 py-1 rounded"><Check className="w-3 h-3"/> Посетил</span>
           : <span className="text-amber-600 text-xs bg-amber-50 px-2 py-1 rounded">Ждет визита</span>
      )
    }
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Пробные занятия</h1>
          <p className="text-muted-foreground mt-1">Быстрая регистрация новичков.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Оформить новичка
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый клиент (Пробное)</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Имя</Label>
                  <Input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label>Фамилия</Label>
                  <Input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Телефон</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+7..." />
              </div>
              <div className="grid gap-2">
                <Label>Цена (₸)</Label>
                <Input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => registerTrialMutation.mutate()} disabled={registerTrialMutation.isPending}>
                {registerTrialMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Создать и Продать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <Loader2 className="animate-spin" /> : (
        <DataTable columns={columns} data={trialUsers} emptyMessage="Пробных пока не было." />
      )}
    </AdminLayout>
  );
};

export default Trials;