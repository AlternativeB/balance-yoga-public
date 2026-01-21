import { useState } from "react";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Loader2, Calendar, LogOut, Edit, MapPin, Instagram, Phone, AlertCircle } from "lucide-react";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ClientProfile = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", phone: "" });

  // 1. Профиль
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['my_profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('clients').select('*').eq('user_id', user.id).single();
      return data;
    },
  });

  // 2. Студия
  const { data: studioInfo } = useQuery({
    queryKey: ['studio_info'],
    queryFn: async () => {
      const { data } = await supabase.from('studio_info').select('*').single();
      return data;
    }
  });

  // 3. Записи
  const { data: myBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['my_bookings_simple'],
    queryFn: async () => {
      if (!client) return [];
      const { data } = await supabase
        .from('attendance')
        .select(`id, status, classes(name, start_time)`)
        .eq('client_id', client.id)
        .eq('status', 'booked') // Берем только активные записи
        .order('classes(start_time)', { ascending: true });
      
      // Фильтруем (показываем только будущие, прошедшие сами исчезнут из актуального)
      const now = new Date();
      return data?.filter((b: any) => new Date(b.classes.start_time) > now) || [];
    },
    enabled: !!client
  });

  // Мутация отмены
  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase.rpc('client_cancel_booking', { p_attendance_id: bookingId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_bookings_simple'] });
      queryClient.invalidateQueries({ queryKey: ['my_active_sub'] });
      queryClient.invalidateQueries({ queryKey: ['client_schedule'] });
      toast({ title: "Успешно", description: "Запись отменена, занятие возвращено." });
    },
    onError: (err) => toast({ variant: "destructive", title: "Ошибка", description: err.message })
  });

  // Обновление профиля
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('clients').update(editForm).eq('id', client.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_profile'] });
      setIsEditOpen(false);
      toast({ title: "Профиль обновлен!" });
    }
  });

  const handleOpenEdit = () => {
    if (client) {
      setEditForm({ first_name: client.first_name, last_name: client.last_name, phone: client.phone });
      setIsEditOpen(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/portal/login";
  };

  if (clientLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin"/></div>;

  return (
    <ClientLayout>
      <div className="space-y-6 pt-4">
        
        {/* Шапка */}
        <div className="text-center relative">
           <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-primary mb-3 shadow-inner border-4 border-white">
              {client?.first_name?.[0]}
           </div>
           <h2 className="text-xl font-bold">{client?.first_name} {client?.last_name}</h2>
           <p className="text-sm text-muted-foreground mb-4">{client?.phone}</p>
           
           <div className="flex justify-center gap-2">
             <Button variant="outline" size="sm" onClick={handleOpenEdit} className="h-8 gap-1"><Edit className="w-3 h-3" /> Изм.</Button>
             <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8" onClick={handleLogout}><LogOut className="w-3 h-3 mr-1" /> Выйти</Button>
           </div>
        </div>

        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-xl">
            <TabsTrigger value="bookings" className="rounded-lg">Мои записи</TabsTrigger>
            <TabsTrigger value="info" className="rounded-lg">О студии</TabsTrigger>
          </TabsList>
          
          <TabsContent value="bookings" className="mt-4 space-y-3 min-h-[200px]">
             {bookingsLoading ? <Loader2 className="animate-spin mx-auto text-primary" /> : myBookings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-2xl border-dashed bg-gray-50 flex flex-col items-center justify-center">
                   <Calendar className="w-8 h-8 mb-2 opacity-20" />
                   <p>Нет активных записей</p>
                </div>
             ) : (
               myBookings.map((booking: any) => {
                 if (!booking.classes) return null;
                 
                 // ПРОВЕРКА ВРЕМЕНИ ДЛЯ КНОПКИ
                 const start = new Date(booking.classes.start_time);
                 const now = new Date();
                 const minutesLeft = differenceInMinutes(start, now);
                 const canCancel = minutesLeft >= 90; // 90 минут = 1.5 часа

                 return (
                   <Card key={booking.id} className="border-none shadow-sm bg-white">
                     <CardContent className="p-4 flex justify-between items-center">
                        <div>
                           <p className="font-bold text-sm text-gray-900">{booking.classes.name}</p>
                           <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(start, "d MMMM, HH:mm")}
                           </p>
                           {!canCancel && (
                             <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600 font-medium">
                               <AlertCircle className="w-3 h-3" /> До урока менее 1.5ч
                             </div>
                           )}
                        </div>
                        
                        {canCancel ? (
                          <Button size="sm" variant="outline" className="text-red-500 border-red-100 h-8 text-xs"
                            onClick={() => { if(confirm("Отменить запись?")) cancelMutation.mutate(booking.id) }}
                            disabled={cancelMutation.isPending}>
                            Отмена
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" disabled className="text-gray-400 h-8 text-xs bg-gray-50">
                            Нельзя отменить
                          </Button>
                        )}
                     </CardContent>
                   </Card>
                 );
               })
             )}
          </TabsContent>

          <TabsContent value="info">
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-5 space-y-4">
                <div>
                  <h4 className="font-bold text-lg mb-2">{studioInfo?.name || "Balance Yoga Studio"}</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{studioInfo?.description}</p>
                </div>
                <div className="pt-2 border-t">
                   <h5 className="font-bold text-sm mb-2">Правила отмены</h5>
                   <ul className="text-xs text-gray-600 list-disc pl-4 space-y-1">
                      <li>Отмена доступна только за <strong>1.5 часа</strong> до начала.</li>
                      <li>Если до урока осталось меньше времени, отменить запись невозможно.</li>
                   </ul>
                </div>
                <div className="space-y-2 pt-2 border-t">
                  {studioInfo?.address && <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-primary"/> {studioInfo.address}</div>}
                  {studioInfo?.phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-primary"/> {studioInfo.phone}</div>}
                  {studioInfo?.instagram && <div className="flex items-center gap-2 text-sm"><Instagram className="w-4 h-4 text-primary"/> {studioInfo.instagram}</div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Модалка редактирования */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Редактировать профиль</DialogTitle></DialogHeader>
            <div className="space-y-3 py-4">
              <div className="space-y-1"><Label>Имя</Label><Input value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} /></div>
              <div className="space-y-1"><Label>Фамилия</Label><Input value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} /></div>
              <div className="space-y-1"><Label>Телефон</Label><Input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></div>
            </div>
            <DialogFooter>
              <Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientLayout>
  );
};

export default ClientProfile;