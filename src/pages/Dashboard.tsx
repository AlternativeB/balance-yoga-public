import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  CreditCard, 
  Activity, 
  TrendingUp,
  Calendar,
  ArrowUpRight,
  Loader2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { startOfMonth, format, parseISO, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";

const Dashboard = () => {
  // 1. ЗАГРУЗКА СТАТИСТИКИ
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: async () => {
      const startOfCurrentMonth = startOfMonth(new Date()).toISOString();
      const today = new Date();

      // A. Активные клиенты
      const { count: activeClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // B. Выручка за этот месяц
      const { data: monthlySubs } = await supabase
        .from('subscriptions')
        .select('price')
        .gte('created_at', startOfCurrentMonth);
      
      const revenue = monthlySubs?.reduce((sum, item) => sum + (item.price || 0), 0) || 0;

      // C. Посещения сегодня
      // (Supabase хранит даты в UTC, поэтому фильтруем на клиенте для точности, либо используем диапазон)
      const { data: todayVisits } = await supabase
        .from('attendance')
        .select('date')
        .gte('date', new Date(new Date().setHours(0,0,0,0)).toISOString());
      
      const visitsCount = todayVisits?.filter(v => isSameDay(parseISO(v.date), today)).length || 0;

      // D. Активные абонементы
      const { count: activeSubs } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      return {
        activeClients: activeClients || 0,
        revenue,
        visitsCount,
        activeSubs: activeSubs || 0
      };
    }
  });

  // 2. БЛИЖАЙШИЕ ЗАНЯТИЯ (СЕГОДНЯ)
  const { data: upcomingClasses = [] } = useQuery({
    queryKey: ['upcoming_dashboard'],
    queryFn: async () => {
      const today = new Date();
      const { data } = await supabase
        .from('classes')
        .select(`*, instructors(first_name, last_name)`)
        .order('start_time', { ascending: true });
        
      // Фильтруем на клиенте и берем только те, что еще не закончились (опционально)
      // Здесь просто покажем все сегодняшние
      return data?.filter((c: any) => isSameDay(parseISO(c.start_time), today)) || [];
    }
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Добро пожаловать 👋</h2>
          <p className="text-muted-foreground mt-2">
            Вот что происходит в студии сегодня.
          </p>
        </div>

        {/* КАРТОЧКИ СО СТАТИСТИКОЙ */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Выручка (Месяц)</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.revenue.toLocaleString()} ₸</div>
              <p className="text-xs text-muted-foreground mt-1 text-green-600 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                С начала месяца
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Активные Клиенты</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeClients}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Всего в базе
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Визиты сегодня</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.visitsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Человек пришло
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Действующие абонементы</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeSubs}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Карт на руках
              </p>
            </CardContent>
          </Card>
        </div>

        {/* СЕКЦИЯ РАСПИСАНИЯ НА СЕГОДНЯ */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Расписание на сегодня</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingClasses.length === 0 ? (
                   <p className="text-muted-foreground text-sm">На сегодня занятий нет.</p>
                ) : (
                  upcomingClasses.map((cls: any) => (
                    <div key={cls.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {format(parseISO(cls.start_time), 'HH:mm')}
                        </div>
                        <div>
                          <p className="font-medium">{cls.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {cls.instructors?.first_name} {cls.instructors?.last_name}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">
                        {format(parseISO(cls.end_time), 'HH:mm')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* БЫСТРЫЕ ДЕЙСТВИЯ */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Быстрые действия</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <a href="/attendance" className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors group">
                <span className="font-medium group-hover:text-primary transition-colors">Отметить клиента</span>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
              </a>
              <a href="/subscriptions" className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors group">
                <span className="font-medium group-hover:text-primary transition-colors">Продать абонемент</span>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
              </a>
              <a href="/clients" className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors group">
                <span className="font-medium group-hover:text-primary transition-colors">Добавить клиента</span>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
              </a>
              <a href="/schedule" className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors group">
                <span className="font-medium group-hover:text-primary transition-colors">Создать урок</span>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;