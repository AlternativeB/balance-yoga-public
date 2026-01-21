import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, User, CheckCircle, Loader2, Trash2, Calendar, Lock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, isSameDay, parseISO, isBefore, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const Attendance = () => {
  // 1. ВЫБОР ДАТЫ
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Состояние для защиты паролем
  const [adminPassword, setAdminPassword] = useState("");
  const [isPasswordCorrect, setIsPasswordCorrect] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Проверка: это прошлое?
  const isPastDate = isBefore(selectedDate, startOfDay(new Date()));

  // 1. ЗАНЯТИЯ НА ВЫБРАННУЮ ДАТУ
  const { data: dayClasses = [], isLoading: classesLoading } = useQuery({
    queryKey: ['dayClasses', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select(`*, instructors(first_name, last_name)`)
        .order('start_time', { ascending: true });
      if (error) throw error;
      
      return data.filter((c: any) => isSameDay(parseISO(c.start_time), selectedDate));
    }
  });

  // 2. ИСТОРИЯ ПОСЕЩЕНИЙ
  const { data: attendanceLog = [] } = useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select(`*, clients(first_name, last_name), classes(name)`)
        .order('date', { ascending: false }) // Свежие сверху
        .limit(30);
      if (error) throw error;
      return data;
    }
  });

  // 3. ПОИСК
  const { data: searchResults = [] } = useQuery({
    queryKey: ['clientSearch', clientSearch],
    queryFn: async () => {
      if (clientSearch.length < 2) return [];
      const { data } = await supabase
        .from('clients')
        .select('*')
        .or(`first_name.ilike.%${clientSearch}%,last_name.ilike.%${clientSearch}%`)
        .limit(5);
      return data || [];
    },
    enabled: clientSearch.length >= 2
  });

  // 4. ОТМЕТИТЬ
  const checkInMutation = useMutation({
    mutationFn: async ({ clientId, classId }: { clientId: string, classId: string }) => {
      const { error } = await supabase.rpc('register_visit', {
        p_client_id: clientId,
        p_class_id: classId
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Успешно!", description: "Клиент отмечен." });
      setIsDialogOpen(false);
      setClientSearch("");
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['classes_with_counts'] }); // Обновим и расписание
    },
    onError: (err) => toast({ variant: "destructive", title: "Ошибка", description: err.message })
  });

  // 5. УДАЛИТЬ ЗАПИСЬ
  const deleteVisitMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('attendance').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Отменено", description: "Посещение удалено." });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });

  // Проверка пароля (Локальная)
  const handlePasswordCheck = () => {
    if (adminPassword === "7777") { // ПАРОЛЬ АДМИНА
      setIsPasswordCorrect(true);
      toast({ title: "Доступ разрешен", description: "Режим редактирования прошлого." });
    } else {
      toast({ variant: "destructive", title: "Неверный пароль" });
    }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Посещения</h1>
          <div className="flex items-center gap-2 mt-2">
            <Input 
                type="date" 
                value={format(selectedDate, "yyyy-MM-dd")} 
                onChange={(e) => {
                    setSelectedDate(new Date(e.target.value));
                    setIsPasswordCorrect(false); // Сбрасываем доступ при смене даты
                    setAdminPassword("");
                }}
                className="w-auto"
            />
            {isPastDate && !isPasswordCorrect && (
                <span className="text-xs text-amber-600 flex items-center gap-1 font-medium bg-amber-50 px-2 py-1 rounded">
                    <Lock className="w-3 h-3" /> Архивный день
                </span>
            )}
            {isPastDate && isPasswordCorrect && (
                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                     Режим Админа
                </span>
            )}
          </div>
        </div>
      </div>

      {/* БЛОКИРОВКА ЕСЛИ ПРОШЛОЕ И НЕТ ПАРОЛЯ */}
      {isPastDate && !isPasswordCorrect ? (
         <Card className="max-w-md mx-auto mt-8 border-amber-200 bg-amber-50/50">
            <CardContent className="pt-6 text-center">
                <Lock className="w-12 h-12 mx-auto text-amber-500 mb-4" />
                <h3 className="font-bold text-lg mb-2">День завершен</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Для редактирования посещений в прошлом требуется доступ администратора.
                </p>
                <div className="flex gap-2 max-w-[200px] mx-auto">
                    <Input 
                        type="password" 
                        placeholder="Пароль" 
                        value={adminPassword} 
                        onChange={(e) => setAdminPassword(e.target.value)} 
                    />
                    <Button onClick={handlePasswordCheck}>OK</Button>
                </div>
            </CardContent>
         </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
            <h2 className="section-title">
                {format(selectedDate, "d MMMM", { locale: ru })}
            </h2>
            {classesLoading && <Loader2 className="animate-spin" />}
            
            {dayClasses.length === 0 && !classesLoading && (
                <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
                Нет занятий в этот день.
                </div>
            )}

            {dayClasses.map((cls: any) => (
                <Card key={cls.id} className="overflow-hidden">
                <CardContent className="p-0 flex items-stretch">
                    <div className="bg-primary/5 p-4 flex flex-col justify-center items-center w-24 border-r border-border/50">
                    <span className="font-bold text-lg">{format(parseISO(cls.start_time), 'HH:mm')}</span>
                    </div>
                    
                    <div className="p-4 flex-1 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-lg">{cls.name}</h3>
                        <p className="text-sm text-muted-foreground">{cls.instructors?.first_name} {cls.instructors?.last_name}</p>
                    </div>

                    <Dialog open={isDialogOpen && selectedClassId === cls.id} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (open) setSelectedClassId(cls.id);
                    }}>
                        <DialogTrigger asChild>
                        <Button>Отметить</Button>
                        </DialogTrigger>
                        <DialogContent>
                        <DialogHeader><DialogTitle>Отметить: {cls.name}</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Имя..." className="pl-9" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                            {searchResults.map((client: any) => (
                                <div key={client.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md border">
                                <div><p className="font-medium">{client.first_name} {client.last_name}</p><StatusBadge status={client.status} /></div>
                                <Button size="sm" onClick={() => checkInMutation.mutate({ clientId: client.id, classId: cls.id })} disabled={checkInMutation.isPending}>Выбрать</Button>
                                </div>
                            ))}
                            </div>
                        </div>
                        </DialogContent>
                    </Dialog>
                    </div>
                </CardContent>
                </Card>
            ))}
            </div>

            <div className="space-y-4">
            <h2 className="section-title">История</h2>
            <div className="space-y-2">
                {attendanceLog.map((log: any) => (
                <div key={log.id} className="bg-card border rounded-lg p-3 flex items-center justify-between gap-3 group">
                    <div className="flex items-start gap-3">
                        <div className="bg-green-100 p-2 rounded-full text-green-700"><CheckCircle className="w-4 h-4" /></div>
                        <div>
                        <p className="font-medium text-sm">{log.clients ? `${log.clients.first_name} ${log.clients.last_name}` : 'Удален'}</p>
                        <p className="text-xs text-muted-foreground">{log.classes?.name} ({format(parseISO(log.date), 'dd.MM')})</p>
                        </div>
                    </div>
                    {/* Кнопка удаления доступна всегда, или тоже можно скрыть */}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => { if (confirm("Отменить?")) deleteVisitMutation.mutate(log.id); }}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
                ))}
            </div>
            </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Attendance;