import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Building2, Plus, Loader2, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, isSameDay, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const Aggregators = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Форма
  const [newVisit, setNewVisit] = useState({
    aggregator: "1Fit",
    class_id: "",
    note: "", // Код или имя
    revenue: "2000" // Примерная ставка за вход
  });

  // 1. ЗАГРУЗКА ИСТОРИИ
  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['aggregator_visits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aggregator_visits')
        .select(`*, classes(name, start_time)`)
        .order('visit_date', { ascending: false });
      if (error) throw error;
      return data as any[];
    }
  });

  // 2. ЗАГРУЗКА УРОКОВ НА СЕГОДНЯ (Для привязки)
  const { data: todayClasses = [] } = useQuery({
    queryKey: ['today_classes_agg'],
    queryFn: async () => {
      const { data } = await supabase
        .from('classes')
        .select('*')
        .order('start_time', { ascending: true });
      
      const today = new Date();
      return data?.filter((c: any) => isSameDay(parseISO(c.start_time), today)) || [];
    }
  });

  // 3. СОЗДАНИЕ ВИЗИТА
  const createVisitMutation = useMutation({
    mutationFn: async () => {
      if (!newVisit.class_id) throw new Error("Выберите урок!");
      
      const { error } = await supabase.from('aggregator_visits').insert([{
        aggregator_name: newVisit.aggregator,
        class_id: newVisit.class_id,
        note: newVisit.note,
        revenue: parseInt(newVisit.revenue),
        visit_date: new Date().toISOString()
      }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aggregator_visits'] });
      setIsDialogOpen(false);
      setNewVisit({ aggregator: "1Fit", class_id: "", note: "", revenue: "2000" });
      toast({ title: "Визит добавлен", description: "Не забудьте свериться в конце месяца." });
    },
    onError: (err) => alert(err.message)
  });

  const columns = [
    {
      key: "aggregator",
      header: "Агрегатор",
      render: (item: any) => (
        <div className="flex items-center gap-2 font-medium">
          <Building2 className="w-4 h-4 text-blue-500" />
          {item.aggregator_name}
        </div>
      )
    },
    {
      key: "class",
      header: "Урок",
      render: (item: any) => (
        <div>
          <p>{item.classes?.name || "Урок удален"}</p>
          <p className="text-xs text-muted-foreground">
            {item.classes?.start_time ? format(parseISO(item.classes.start_time), "dd.MM HH:mm") : "-"}
          </p>
        </div>
      )
    },
    {
      key: "note",
      header: "Код / Имя",
      render: (item: any) => <span className="font-mono bg-muted px-2 py-1 rounded">{item.note || "-"}</span>
    },
    {
      key: "revenue",
      header: "Выручка",
      render: (item: any) => <span>{item.revenue} ₸</span>
    },
    {
      key: "date",
      header: "Время",
      render: (item: any) => <span className="text-xs text-muted-foreground">{format(parseISO(item.visit_date), "HH:mm")}</span>
    }
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">1Fit / Агрегаторы</h1>
          <p className="text-muted-foreground mt-1">Учет внешних посещений.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Зафиксировать визит
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый визит (1Fit)</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Агрегатор</Label>
                <Select 
                  value={newVisit.aggregator}
                  onValueChange={(val) => setNewVisit({...newVisit, aggregator: val})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1Fit">1Fit</SelectItem>
                    <SelectItem value="ClassPass">ClassPass</SelectItem>
                    <SelectItem value="Другое">Другое</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Урок (Сегодня)</Label>
                <Select 
                  value={newVisit.class_id}
                  onValueChange={(val) => setNewVisit({...newVisit, class_id: val})}
                >
                  <SelectTrigger><SelectValue placeholder="Выберите урок..." /></SelectTrigger>
                  <SelectContent>
                    {todayClasses.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {format(parseISO(c.start_time), "HH:mm")} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {todayClasses.length === 0 && <p className="text-xs text-red-500">Нет уроков на сегодня в расписании</p>}
              </div>

              <div className="grid gap-2">
                <Label>Код или Имя клиента</Label>
                <Input 
                  placeholder="Например: 8492"
                  value={newVisit.note}
                  onChange={(e) => setNewVisit({...newVisit, note: e.target.value})}
                />
              </div>

              <div className="grid gap-2">
                <Label>Сумма к выплате (₸)</Label>
                <Input 
                  type="number"
                  value={newVisit.revenue}
                  onChange={(e) => setNewVisit({...newVisit, revenue: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createVisitMutation.mutate()} disabled={createVisitMutation.isPending}>
                {createVisitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
         <div className="stat-card">
            <p className="stat-label">Визитов 1Fit (Всего)</p>
            <p className="stat-value mt-1">{visits.length}</p>
         </div>
         <div className="stat-card">
            <p className="stat-label">Ожидаемая выплата</p>
            <p className="stat-value mt-1 text-green-600">
               {visits.reduce((acc, v) => acc + (v.revenue || 0), 0).toLocaleString()} ₸
            </p>
         </div>
      </div>

      {isLoading ? <Loader2 className="animate-spin" /> : (
        <DataTable columns={columns} data={visits} emptyMessage="Визитов пока нет." />
      )}
    </AdminLayout>
  );
};

export default Aggregators;