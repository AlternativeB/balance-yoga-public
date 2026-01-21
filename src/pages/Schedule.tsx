import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, ChevronLeft, ChevronRight, Copy, Plus, Edit2 } from "lucide-react"; // Dobavil Edit2
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Schedule = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // ID редактируемого урока
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "", date: "", time: "", duration: "60", instructor_id: "", max_capacity: "10", room: "Большой зал"
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  // 1. Загрузка уроков
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['schedule', weekStart],
    queryFn: async () => {
      const start = weekStart.toISOString();
      const end = addDays(weekStart, 7).toISOString();
      const { data, error } = await supabase.rpc('get_classes_with_occupancy', { start_range: start, end_range: end });
      if (error) throw error;
      return data;
    }
  });

  // 2. Загрузка тренеров
  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: async () => {
      const { data } = await supabase.from('instructors').select('*').eq('status', 'active');
      return data || [];
    }
  });

  // 3. Сохранение (Создание ИЛИ Обновление)
  const saveMutation = useMutation({
    mutationFn: async () => {
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(formData.duration) * 60000);
      
      const payload = {
        name: formData.name,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        instructor_id: formData.instructor_id,
        max_capacity: parseInt(formData.max_capacity),
        room: formData.room
      };

      if (editingId) {
        // ОБНОВЛЕНИЕ
        const { error } = await supabase.from('classes').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        // СОЗДАНИЕ
        const { error } = await supabase.from('classes').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      setIsDialogOpen(false);
      toast({ title: editingId ? "Урок обновлен" : "Урок создан" });
    },
    onError: (err) => toast({ variant: "destructive", title: "Ошибка", description: err.message })
  });

  // Копирование недели
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('duplicate_week_schedule', { start_date: format(weekStart, 'yyyy-MM-dd') });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Скопировано!" });
      setCurrentDate(addWeeks(currentDate, 1));
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    }
  });

  // Открытие модалки для СОЗДАНИЯ
  const openCreate = (dateStr: string) => {
    setEditingId(null);
    setFormData({ 
      name: "", date: dateStr, time: "10:00", duration: "60", instructor_id: "", max_capacity: "12", room: "Большой зал" 
    });
    setIsDialogOpen(true);
  };

  // Открытие модалки для РЕДАКТИРОВАНИЯ
  const openEdit = (cls: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Чтобы не срабатывал клик по карточке (если будет)
    setEditingId(cls.id);
    
    const start = new Date(cls.start_time);
    const end = new Date(cls.end_time);
    const duration = (end.getTime() - start.getTime()) / 60000;

    setFormData({
      name: cls.name,
      date: format(start, 'yyyy-MM-dd'),
      time: format(start, 'HH:mm'),
      duration: duration.toString(),
      instructor_id: cls.instructor_id || "",
      max_capacity: cls.max_capacity.toString(),
      room: cls.room || "Большой зал"
    });
    setIsDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div><h1 className="page-title">Расписание</h1></div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="font-medium w-[140px] text-center">{format(weekStart, 'd MMM', { locale: ru })} - {format(addDays(weekStart, 6), 'd MMM', { locale: ru })}</span>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <div className="flex gap-2">
           <Button variant="secondary" onClick={() => { if(confirm("Дублировать неделю?")) duplicateMutation.mutate() }} disabled={duplicateMutation.isPending}>
             <Copy className="w-4 h-4 mr-2" /> Дублировать
           </Button>
           <Button onClick={() => openCreate(format(new Date(), 'yyyy-MM-dd'))}><Plus className="w-4 h-4 mr-2" /> Создать</Button>
        </div>
      </div>

      {isLoading ? <div className="p-10 text-center"><Loader2 className="animate-spin inline"/></div> : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const dayClasses = classes.filter((c: any) => new Date(c.start_time).getDate() === day.getDate());
            return (
              <div key={day.toString()} className="flex flex-col gap-2 min-h-[200px]">
                <div className="text-center p-2 bg-gray-50 rounded-lg border font-bold capitalize">
                  {format(day, 'EEE dd.MM', { locale: ru })}
                </div>
                {dayClasses.map((cls: any) => (
                   <Card key={cls.id} className="p-2 text-sm hover:shadow-md transition-shadow border-l-4 border-l-primary relative group">
                      <div className="font-bold flex justify-between items-start">
                        {format(new Date(cls.start_time), 'HH:mm')}
                        {/* КНОПКА РЕДАКТИРОВАНИЯ */}
                        <button onClick={(e) => openEdit(cls, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded text-gray-500">
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="font-medium leading-tight mb-1">{cls.name}</div>
                      <div className="text-[10px] text-muted-foreground">{cls.room}</div>
                      <div className="text-xs mt-1 flex justify-between text-muted-foreground">
                         <span>{cls.instructor_first_name}</span>
                         <span>{cls.booked_count}/{cls.max_capacity}</span>
                      </div>
                   </Card>
                ))}
                <Button variant="ghost" className="w-full text-xs h-8 border-dashed border text-muted-foreground" onClick={() => openCreate(format(day, 'yyyy-MM-dd'))}>+</Button>
              </div>
            );
          })}
        </div>
      )}

      {/* МОДАЛКА */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Редактировать урок" : "Новый урок"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Название</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="grid gap-2"><Label>Дата</Label><Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
               <div className="grid gap-2"><Label>Время</Label><Input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="grid gap-2"><Label>Длительность (мин)</Label><Input type="number" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} /></div>
               <div className="grid gap-2"><Label>Мест</Label><Input type="number" value={formData.max_capacity} onChange={e => setFormData({...formData, max_capacity: e.target.value})} /></div>
            </div>

            <div className="grid gap-2">
               <Label>Зал</Label>
               <Select onValueChange={v => setFormData({...formData, room: v})} value={formData.room}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Большой зал">Большой зал</SelectItem>
                    <SelectItem value="Малый зал">Малый зал</SelectItem>
                    <SelectItem value="Индивидуальный">Индивидуальный</SelectItem>
                  </SelectContent>
               </Select>
            </div>

            <div className="grid gap-2">
               <Label>Тренер</Label>
               <Select onValueChange={v => setFormData({...formData, instructor_id: v})} value={formData.instructor_id}>
                  <SelectTrigger><SelectValue placeholder="Выберите тренера" /></SelectTrigger>
                  <SelectContent>
                    {instructors.map((i: any) => (
                      <SelectItem key={i.id} value={i.id}>{i.first_name} {i.last_name}</SelectItem>
                    ))}
                  </SelectContent>
               </Select>
            </div>
          </div>
          <DialogFooter>
             <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Schedule;