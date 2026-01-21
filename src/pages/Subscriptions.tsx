import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
// Мы убрали Select, так как теперь используем Combobox для клиентов
import { Search, CreditCard, Loader2, Plus, AlertTriangle, CalendarOff, Infinity, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { differenceInDays, addDays, format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ClientCombobox } from "@/components/ui/client-combobox"; // <-- НОВЫЙ ИМПОРТ

const Subscriptions = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isUnlimited, setIsUnlimited] = useState(false);

  // Форма
  const [formData, setFormData] = useState({
    client_id: "",
    type: "",
    price: "",
    sessions: "12",
    start_date: format(new Date(), "yyyy-MM-dd"),
    duration_days: "30"
  });

  // 1. ЗАГРУЗКА АБОНЕМЕНТОВ
  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`*, clients ( id, first_name, last_name, email )`)
        .order('end_date', { ascending: true });
      if (error) throw error;
      return data as any[]; 
    }
  });

  // 2. ЗАГРУЗКА СПИСКА КЛИЕНТОВ (Для поиска)
  const { data: clientsList = [] } = useQuery({
    queryKey: ['clients_list'],
    queryFn: async () => {
      // Нам нужны id и имена для Combobox
      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .eq('status', 'active');
      return data || [];
    }
  });

  // 3. СОЗДАНИЕ / ОБНОВЛЕНИЕ
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formData.client_id) throw new Error("Выберите клиента!");
      if (!formData.type) throw new Error("Введите название абонемента!");

      // Если безлимит - ставим null, иначе берем число
      const sessionsCount = isUnlimited ? null : parseInt(formData.sessions);
      const startDate = new Date(formData.start_date);
      
      // Рассчитываем дату конца
      const endDate = addDays(startDate, parseInt(formData.duration_days));
      const endDateIso = endDate.toISOString();

      const payload = {
        client_id: formData.client_id,
        type: formData.type, 
        start_date: startDate.toISOString(),
        end_date: endDateIso,
        price: parseInt(formData.price) || 0,
        // При редактировании обновляем текущий остаток
        sessions_remaining: sessionsCount,
        status: 'active'
      };

      if (editingId) {
        // UPDATE
        const { error } = await supabase.from('subscriptions').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        // INSERT (Добавляем sessions_total только при создании)
        const insertPayload = { ...payload, sessions_total: sessionsCount };
        const { error } = await supabase.from('subscriptions').insert([insertPayload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      handleCloseDialog();
      toast({ title: "Успешно!", description: editingId ? "Абонемент обновлен." : "Абонемент выдан." });
    },
    onError: (err) => alert(err.message)
  });

  // 4. УДАЛЕНИЕ
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subscriptions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      handleCloseDialog();
      toast({ title: "Удалено", description: "Абонемент удален." });
    },
  });

  // ОТКРЫТИЕ ДЛЯ СОЗДАНИЯ
  const openCreateDialog = () => {
    setEditingId(null);
    setFormData({
      client_id: "",
      type: "",
      price: "",
      sessions: "12",
      start_date: format(new Date(), "yyyy-MM-dd"),
      duration_days: "30"
    });
    setIsUnlimited(false);
    setIsDialogOpen(true);
  };

  // ОТКРЫТИЕ ДЛЯ РЕДАКТИРОВАНИЯ
  const openEditDialog = (sub: any) => {
    const start = parseISO(sub.start_date);
    const end = parseISO(sub.end_date);
    const daysDiff = differenceInDays(end, start);
    
    setEditingId(sub.id);
    setFormData({
      client_id: sub.client_id,
      type: sub.type,
      price: sub.price,
      sessions: sub.sessions_remaining === null ? "0" : sub.sessions_remaining.toString(),
      start_date: format(start, "yyyy-MM-dd"),
      duration_days: daysDiff.toString()
    });
    setIsUnlimited(sub.sessions_remaining === null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
  };

  // Логика цветов даты
  const getDateColor = (dateString: string) => {
    const today = new Date();
    const end = new Date(dateString);
    const daysLeft = differenceInDays(end, today);

    if (daysLeft < 0) return "text-red-600 font-bold flex items-center gap-1"; 
    if (daysLeft <= 5) return "text-amber-600 font-bold flex items-center gap-1"; 
    return "text-muted-foreground"; 
  };

  const filteredSubs = subscriptions.filter((sub: any) => {
    const fullName = `${sub.clients?.first_name} ${sub.clients?.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || sub.type.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const columns = [
    {
      key: "clientName",
      header: "Клиент",
      render: (sub: any) => (
        <div>
          <p className="font-medium">
            {sub.clients ? `${sub.clients.first_name} ${sub.clients.last_name}` : "Неизвестно"}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Название",
      render: (sub: any) => (
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{sub.type}</span>
        </div>
      ),
    },
    {
      key: "remaining",
      header: "Остаток",
      render: (sub: any) => (
        <span className={`font-mono text-sm flex items-center gap-1 ${sub.sessions_remaining !== null && sub.sessions_remaining < 3 ? 'text-red-500 font-bold' : ''}`}>
          {sub.sessions_remaining === null ? (
            <>
              <Infinity className="w-4 h-4 text-primary" /> 
              <span className="text-primary font-semibold">Безлимит</span>
            </>
          ) : (
            `${sub.sessions_remaining} зан.`
          )}
        </span>
      ),
    },
    {
      key: "dates",
      header: "Истекает",
      render: (sub: any) => {
        const colorClass = getDateColor(sub.end_date);
        const daysLeft = differenceInDays(new Date(sub.end_date), new Date());
        
        return (
          <div className={colorClass}>
            {daysLeft < 0 && <CalendarOff className="w-4 h-4" />}
            {daysLeft >= 0 && daysLeft <= 5 && <AlertTriangle className="w-4 h-4" />}
            <span>{new Date(sub.end_date).toLocaleDateString('ru-RU')}</span>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (sub: any) => (
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditDialog(sub); }}>
          <Edit className="w-4 h-4 text-muted-foreground" />
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Абонементы</h1>
          <p className="text-muted-foreground mt-1">
            Управление продажами.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <Button className="gap-2" onClick={openCreateDialog}>
              <Plus className="w-4 h-4" />
              Выдать абонемент
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Редактировать абонемент" : "Новый абонемент"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              
              {/* --- ВОТ ЗДЕСЬ ИЗМЕНЕНИЕ: ClientCombobox --- */}
              <div className="grid gap-2">
                <Label>Клиент *</Label>
                <ClientCombobox 
                  clients={clientsList}
                  value={formData.client_id}
                  onChange={(val) => setFormData({...formData, client_id: val})}
                  disabled={!!editingId}
                />
              </div>
              {/* ------------------------------------------- */}

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Название</Label>
                  <Input 
                    value={formData.type} 
                    onChange={(e) => setFormData({...formData, type: e.target.value})} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Цена (₸)</Label>
                  <Input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                </div>
              </div>

              <div className="grid gap-2 p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <input 
                    type="checkbox" 
                    id="unlimited" 
                    className="w-4 h-4"
                    checked={isUnlimited}
                    onChange={(e) => setIsUnlimited(e.target.checked)}
                  />
                  <Label htmlFor="unlimited" className="cursor-pointer font-semibold">Это Безлимит</Label>
                </div>
                
                <div className="grid gap-2">
                  <Label className={isUnlimited ? "opacity-50" : ""}>Остаток занятий</Label>
                  <Input 
                    type="number" 
                    value={formData.sessions} 
                    onChange={(e) => setFormData({...formData, sessions: e.target.value})} 
                    disabled={isUnlimited} 
                    className={isUnlimited ? "opacity-50 cursor-not-allowed bg-muted" : ""}
                  />
                </div>
              </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Дата начала</Label>
                    <Input type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Длительность (дней)</Label>
                    <Input type="number" value={formData.duration_days} onChange={(e) => setFormData({...formData, duration_days: e.target.value})} />
                  </div>
                </div>
            </div>
            <DialogFooter className="flex justify-between sm:justify-between">
              {editingId && (
                 <Button 
                   variant="destructive" 
                   size="icon"
                   onClick={() => {
                     if (confirm("Удалить абонемент?")) deleteMutation.mutate(editingId);
                   }}
                 >
                   <Trash2 className="w-4 h-4" />
                 </Button>
              )}
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Сохранить" : "Продать"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени или типу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
      ) : (
        <DataTable columns={columns} data={filteredSubs} emptyMessage="Нет активных абонементов." />
      )}
    </AdminLayout>
  );
};

export default Subscriptions;
