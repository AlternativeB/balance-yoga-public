import { useState } from "react";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, addDays, isSameDay, parseISO, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, MapPin, User, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ClientSchedule = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Показываем только ближайшие 7 дней
  const days = Array.from({ length: 7 }).map((_, i) => addDays(new Date(), i));

  // 1. Загрузка уроков
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['client_schedule', selectedDate],
    queryFn: async () => {
      const start = startOfDay(selectedDate).toISOString();
      const end = addDays(startOfDay(selectedDate), 1).toISOString();
      const { data, error } = await supabase.rpc('get_classes_with_occupancy', { start_range: start, end_range: end });
      if (error) throw error;
      return data;
    }
  });

  // 2. Мои записи
  const { data: myBookings = [] } = useQuery({
    queryKey: ['my_bookings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: client } = await supabase.from('clients').select('id').eq('user_id', user.id).single();
      if (!client) return [];
      const { data } = await supabase.from('attendance').select('class_id').eq('client_id', client.id);
      return data?.map(d => d.class_id) || [];
    }
  });

  const bookMutation = useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase.rpc('client_book_class', { p_class_id: classId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Успешно!", description: "Вы записаны." });
      queryClient.invalidateQueries({ queryKey: ['client_schedule'] });
      queryClient.invalidateQueries({ queryKey: ['my_bookings'] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Ошибка", description: err.message })
  });

  // ФИЛЬТРАЦИЯ: Убираем уроки, которые уже прошли СЕГОДНЯ
  // Если selectedDate это сегодня, скрываем прошедшие часы. Если завтра - показываем всё.
  const now = new Date();
  const filteredClasses = classes.filter((cls: any) => {
    const classTime = new Date(cls.start_time);
    // Показывать только если время урока больше текущего времени
    return classTime > now;
  });

  return (
    <ClientLayout>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Расписание</h2>
        
        {/* Календарь */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
          {days.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            return (
              <button key={day.toString()} onClick={() => setSelectedDate(day)}
                className={cn("flex flex-col items-center justify-center min-w-[60px] h-[75px] rounded-2xl border transition-all shrink-0",
                  isSelected ? "bg-primary text-white border-primary shadow-lg scale-105" : "bg-white text-gray-400 border-gray-100"
                )}>
                <span className="text-xs font-medium capitalize">{format(day, "EEE", { locale: ru })}</span>
                <span className="text-xl font-bold">{format(day, "d")}</span>
              </button>
            );
          })}
        </div>

        {/* Список уроков */}
        <div className="space-y-3">
          {isLoading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div> : filteredClasses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl bg-gray-50">
              {isSameDay(selectedDate, new Date()) ? "На сегодня занятий больше нет" : "Занятий нет"}
            </div>
          ) : (
            filteredClasses.map((cls: any) => {
              const isFull = cls.booked_count >= cls.max_capacity;
              const isBooked = myBookings.includes(cls.id);
              const spotsLeft = cls.max_capacity - cls.booked_count;

              return (
                <Card key={cls.id} className="border-none shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="flex items-stretch">
                    <div className="w-20 bg-primary/5 flex flex-col items-center justify-center p-2 border-r border-gray-50">
                      <span className="text-lg font-bold text-primary">{format(parseISO(cls.start_time), "HH:mm")}</span>
                      <span className="text-xs text-muted-foreground">{format(parseISO(cls.end_time), "HH:mm")}</span>
                    </div>

                    <div className="flex-1 p-3 pl-4 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 leading-tight text-sm mb-1">{cls.name}</h3>
                        <div className="flex items-center gap-3 flex-wrap">
                           <div className="flex items-center gap-1 text-xs text-muted-foreground"><User className="w-3 h-3"/> {cls.instructor_first_name}</div>
                           {/* ТЕПЕРЬ ПОКАЗЫВАЕМ РЕАЛЬНЫЙ ЗАЛ */}
                           <div className="flex items-center gap-1 text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded"><MapPin className="w-3 h-3"/> {cls.room || "Зал 1"}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                         <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide", isFull ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700")}>
                            {isFull ? "Мест нет" : `${spotsLeft} мест`}
                         </span>
                         
                         {isBooked ? (
                           <Button size="sm" variant="outline" className="h-8 gap-1 text-green-600 bg-green-50 border-green-200 pointer-events-none text-xs"><Check className="w-3 h-3" /> Вы записаны</Button>
                         ) : (
                           <Button size="sm" className="h-8 text-xs" disabled={isFull || bookMutation.isPending} onClick={() => bookMutation.mutate(cls.id)}>
                              {bookMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin"/> : "Записаться"}
                           </Button>
                         )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </ClientLayout>
  );
};
export default ClientSchedule;