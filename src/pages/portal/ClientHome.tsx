import { useState } from "react";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Loader2, Ticket, Megaphone, CalendarCheck, Dumbbell } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const ClientHome = () => {
  const { toast } = useToast();
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [preferredTime, setPreferredTime] = useState("");

  const { data: client } = useQuery({
    queryKey: ['my_profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");
      const { data } = await supabase.from('clients').select('*').eq('user_id', user.id).single();
      return data;
    }
  });

  const { data: activeSub, isLoading: subLoading } = useQuery({
    queryKey: ['my_active_sub'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: clientData } = await supabase.from('clients').select('id').eq('user_id', user.id).single();
      if (!clientData) return null;

      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('client_id', clientData.id)
        .eq('status', 'active')
        .gt('end_date', new Date().toISOString())
        .order('end_date', { ascending: true })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!client
  });

  const { data: news = [] } = useQuery({
    queryKey: ['public_news'],
    queryFn: async () => {
      const { data } = await supabase.from('news').select('*').eq('is_active', true).order('created_at', { ascending: false });
      return data || [];
    }
  });

  const personalRequestMutation = useMutation({
    mutationFn: async () => {
      if (!client) return;
      if (!preferredTime) throw new Error("Выберите время!");
      const { error } = await supabase.from('personal_requests').insert([{
        client_id: client.id,
        preferred_time: `${preferredTime} | Комментарий: ${requestNote}`,
        status: 'new'
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      setIsRequestOpen(false);
      setRequestNote("");
      toast({ title: "Заявка отправлена!", description: "Администратор свяжется с вами." });
    },
    onError: (err) => toast({ variant: "destructive", title: "Ошибка", description: err.message })
  });

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center pt-2">
          <div>
            <h2 className="text-2xl font-bold font-serif text-gray-900">
              Привет, {client?.first_name || "Гость"}! 👋
            </h2>
            <p className="text-muted-foreground text-sm">Balance Yoga Studio</p>
          </div>
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
            {client?.first_name?.[0]}
          </div>
        </div>

        {/* Абонемент */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2C3E50] to-[#4CA1AF] p-6 text-white shadow-xl">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
               <span className="text-[10px] font-medium opacity-80 uppercase tracking-widest">Мой абонемент</span>
               <Ticket className="w-5 h-5 opacity-80" />
            </div>
            {subLoading ? <Loader2 className="animate-spin" /> : activeSub ? (
              <div>
                <h3 className="text-xl font-bold mb-1 leading-tight">{activeSub.type}</h3>
                <div className="flex items-end justify-between mt-5">
                  <div>
                    <p className="text-[10px] opacity-60 uppercase mb-0.5">Остаток</p>
                    <p className="text-3xl font-bold">
                      {activeSub.sessions_remaining === null ? "∞" : activeSub.sessions_remaining}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] opacity-60 uppercase mb-0.5">Истекает</p>
                    <p className="text-sm font-medium tracking-wide">
                      {new Date(activeSub.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="mb-3 font-medium text-sm">Нет активного абонемента</p>
                <div className="text-xs opacity-80">Напишите администратору для продления</div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link to="/portal/schedule">
            <Button className="w-full h-12 text-sm shadow-sm" variant="outline">
              <CalendarCheck className="w-4 h-4 mr-2 text-primary" /> Расписание
            </Button>
          </Link>
          <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
            <DialogTrigger asChild>
              <Button className="w-full h-12 text-sm shadow-sm" variant="outline">
                <Dumbbell className="w-4 h-4 mr-2 text-primary" /> Персональная
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Заявка на персоналку</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Удобное время</label>
                  <Select onValueChange={setPreferredTime} value={preferredTime}>
                    <SelectTrigger><SelectValue placeholder="Выберите..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Утро (07:00 - 12:00)">Утро (07:00 - 12:00)</SelectItem>
                      <SelectItem value="День (12:00 - 17:00)">День (12:00 - 17:00)</SelectItem>
                      <SelectItem value="Вечер (17:00 - 22:00)">Вечер (17:00 - 22:00)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                   <label className="text-sm font-medium">Пожелания</label>
                   <Textarea placeholder="Ваши цели или ограничения..." value={requestNote} onChange={(e) => setRequestNote(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => personalRequestMutation.mutate()} disabled={personalRequestMutation.isPending}>
                  {personalRequestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Отправить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* НОВОСТИ (ТЕПЕРЬ РАСКРЫВАЮТСЯ) */}
        <div>
          <h3 className="font-bold mb-3 text-lg flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" /> Новости
          </h3>
          <div className="space-y-3">
            {news.length === 0 ? (
               <div className="p-4 bg-gray-50 rounded-xl text-center text-sm text-muted-foreground border border-dashed">Нет новостей</div>
            ) : (
              news.map((item: any) => (
                <Dialog key={item.id}>
                  <DialogTrigger asChild>
                    <Card className="border-none shadow-sm bg-white overflow-hidden active:scale-[0.99] transition-transform cursor-pointer">
                      <CardContent className="p-4">
                        <h4 className="font-bold text-sm mb-1 line-clamp-1">{item.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.content}</p>
                        <div className="mt-2 text-[10px] text-primary font-medium">Читать далее →</div>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{item.title}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-sm leading-relaxed whitespace-pre-wrap">
                      {item.content}
                    </div>
                  </DialogContent>
                </Dialog>
              ))
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientHome;