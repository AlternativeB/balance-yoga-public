import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { format, startOfWeek, addDays, parseISO, addMinutes } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Trash2, Plus, Users, Pencil, MapPin } from "lucide-react";
import { toast } from "sonner";

// --- ТИПЫ ---
type ClassType = { id: string; name: string; duration_minutes: number; color_hex: string; };
type Instructor = { id: string; name: string; };
type Session = {
  id: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  room: string; // <--- НОВОЕ ПОЛЕ
  class_type: ClassType;
  class_type_id: string;
  instructor: Instructor;
  instructor_id: string;
  bookings_count?: number;
};

const Schedule = () => {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  // 1. ЗАГРУЗКА РАСПИСАНИЯ
  const { data: sessions } = useQuery({
    queryKey: ["schedule", weekStart.toISOString()],
    queryFn: async () => {
        const start = weekStart.toISOString();
        const end = addDays(weekStart, 7).toISOString();

        const { data, error } = await supabase
            .from("schedule_sessions")
            .select(`
                *,
                class_type:class_types(*),
                instructor:instructors(*),
                bookings:class_bookings(count) 
            `)
            .gte("start_time", start)
            .lt("start_time", end)
            .order("start_time");

        if (error) throw error;
        
        return data.map((item: any) => ({
            ...item,
            bookings_count: item.bookings ? item.bookings[0]?.count : 0
        })) as Session[];
    }
  });

  // 2. УДАЛЕНИЕ
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
        const { error } = await supabase.from("schedule_sessions").delete().eq("id", id);
        if (error) throw error;
    },
    onSuccess: () => {
        toast.success("Занятие удалено");
        queryClient.invalidateQueries({ queryKey: ["schedule"] });
    }
  });

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-100px)]">
        
        {/* ШАПКА */}
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold capitalize">
                    {format(currentDate, "LLLL yyyy", { locale: ru })}
                </h1>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date())}>
                        <span className="text-xs font-bold">Сегодня</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                    <Button><Plus className="mr-2 h-4 w-4"/> Добавить урок</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Новое занятие</DialogTitle></DialogHeader>
                    <SessionForm onSuccess={() => { setIsCreateOpen(false); queryClient.invalidateQueries({ queryKey: ["schedule"] }); }} />
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingSession} onOpenChange={(open) => !open && setEditingSession(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Редактировать занятие</DialogTitle></DialogHeader>
                    {editingSession && (
                        <SessionForm 
                            sessionToEdit={editingSession} 
                            onSuccess={() => { 
                                setEditingSession(null); 
                                queryClient.invalidateQueries({ queryKey: ["schedule"] }); 
                            }} 
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>

        {/* СЕТКА */}
        <div className="grid grid-cols-7 gap-4 flex-1 overflow-auto min-w-[1000px]">
            {weekDays.map((day) => {
                const daySessions = sessions?.filter(s => 
                    format(parseISO(s.start_time), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
                );

                return (
                    <div key={day.toString()} className="flex flex-col gap-2">
                        <div className={`text-center p-2 rounded ${format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") ? "bg-primary text-primary-foreground" : "bg-slate-100"}`}>
                            <div className="font-bold capitalize">{format(day, "EEEE", { locale: ru })}</div>
                            <div className="text-sm opacity-80">{format(day, "d MMM", { locale: ru })}</div>
                        </div>

                        <div className="space-y-2">
                            {daySessions?.map((session) => (
                                <Card key={session.id} className="shadow-sm hover:shadow-md transition-shadow relative group">
                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <Button 
                                            variant="secondary" size="icon" className="h-6 w-6" 
                                            onClick={() => setEditingSession(session)}
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                            variant="destructive" size="icon" className="h-6 w-6" 
                                            onClick={() => deleteMutation.mutate(session.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    <CardContent className="p-3 text-sm border-l-4" style={{ borderLeftColor: session.class_type?.color_hex || "#ccc" }}>
                                        <div className="font-bold text-gray-900">
                                            {format(parseISO(session.start_time), "HH:mm")}
                                        </div>
                                        <div className="font-semibold truncate" title={session.class_type?.name}>
                                            {session.class_type?.name}
                                        </div>
                                        <div className="text-gray-500 text-xs truncate">
                                            {session.instructor?.name}
                                        </div>
                                        
                                        {/* ОТОБРАЖЕНИЕ ЗАЛА */}
                                        <div className="flex items-center gap-1 mt-1 text-xs text-blue-600 font-medium">
                                            <MapPin className="h-3 w-3" />
                                            <span>{session.room || "Зал не указан"}</span>
                                        </div>

                                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                                            <Users className="h-3 w-3" />
                                            <span>{session.bookings_count || 0} / {session.max_capacity}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </AdminLayout>
  );
};

// --- ФОРМА ---
const SessionForm = ({ onSuccess, sessionToEdit }: { onSuccess: () => void, sessionToEdit?: Session }) => {
    const { data: types } = useQuery({ 
        queryKey: ["types"], 
        queryFn: async () => (await supabase.from("class_types").select("*")).data as ClassType[] 
    });
    const { data: instructors } = useQuery({ 
        queryKey: ["instructors"], 
        queryFn: async () => (await supabase.from("instructors").select("*")).data as Instructor[] 
    });

    const initialDate = sessionToEdit ? format(parseISO(sessionToEdit.start_time), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    const initialTime = sessionToEdit ? format(parseISO(sessionToEdit.start_time), "HH:mm") : "10:00";

    const [formData, setFormData] = useState({
        class_type_id: sessionToEdit?.class_type_id || "",
        instructor_id: sessionToEdit?.instructor_id || "",
        date: initialDate,
        time: initialTime,
        capacity: sessionToEdit?.max_capacity || 10,
        room: sessionToEdit?.room || "Большой зал" // <--- НОВОЕ ПОЛЕ
    });

    const mutation = useMutation({
        mutationFn: async () => {
            if (!formData.class_type_id || !formData.instructor_id) throw new Error("Заполните все поля");
            
            const type = types?.find(t => t.id === formData.class_type_id);
            const duration = type?.duration_minutes || 60;

            const startDateTime = new Date(`${formData.date}T${formData.time}`);
            const endDateTime = addMinutes(startDateTime, duration);

            const payload = {
                class_type_id: formData.class_type_id,
                instructor_id: formData.instructor_id,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                max_capacity: formData.capacity,
                room: formData.room // <--- ОТПРАВЛЯЕМ В БАЗУ
            };

            if (sessionToEdit) {
                const { error } = await supabase.from("schedule_sessions").update(payload).eq("id", sessionToEdit.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("schedule_sessions").insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast.success(sessionToEdit ? "Занятие обновлено" : "Занятие добавлено");
            onSuccess();
        },
        onError: (e) => toast.error(e.message)
    });

    return (
        <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Дата</Label>
                    <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Время начала</Label>
                    <Input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Зал</Label>
                {/* ВЫБОР ЗАЛА */}
                <Select value={formData.room} onValueChange={v => setFormData({...formData, room: v})}>
                    <SelectTrigger><SelectValue placeholder="Выберите зал" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Большой зал">Большой зал</SelectItem>
                        <SelectItem value="Малый зал">Малый зал</SelectItem>
                        <SelectItem value="VIP Зал">VIP Зал</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Тип занятия</Label>
                <Select value={formData.class_type_id} onValueChange={v => setFormData({...formData, class_type_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Выберите тип" /></SelectTrigger>
                    <SelectContent>
                        {types?.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.duration_minutes} мин)</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Инструктор</Label>
                <Select value={formData.instructor_id} onValueChange={v => setFormData({...formData, instructor_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Выберите тренера" /></SelectTrigger>
                    <SelectContent>
                        {instructors?.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Мест в группе</Label>
                <Input type="number" value={formData.capacity} onChange={e => setFormData({...formData, capacity: Number(e.target.value)})} />
            </div>

            <Button className="w-full mt-2" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {sessionToEdit ? "Сохранить изменения" : "Создать занятие"}
            </Button>
        </div>
    )
}

export default Schedule;