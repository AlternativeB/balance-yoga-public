import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Filter, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

// Обновили интерфейс под новую базу
interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: "active" | "frozen" | "archived";
  source: string;
  registration_date: string;
}

const Clients = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Состояние формы (теперь Имя и Фамилия отдельно)
  const [newClient, setNewClient] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    source: "Администратор"
  });

  // 1. ЗАГРУЗКА КЛИЕНТОВ
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Client[];
    }
  });

  // 2. СОЗДАНИЕ КЛИЕНТА (С раздельными именами)
  const createClientMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('clients')
        .insert([{
          first_name: newClient.first_name,
          last_name: newClient.last_name,
          email: newClient.email || null,
          phone: newClient.phone || null,
          source: newClient.source,
          status: 'active'
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsDialogOpen(false);
      setNewClient({ first_name: "", last_name: "", email: "", phone: "", source: "Администратор" });
      toast({ title: "Успешно!", description: "Новый клиент добавлен." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Ошибка", description: error.message });
    }
  });

  // Поиск (ищет и по имени, и по фамилии)
  const filteredClients = clients.filter(client =>
    client.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const columns = [
    {
      key: "name",
      header: "ФИО",
      render: (client: Client) => (
        <div>
          <p className="font-medium text-foreground">
            {client.first_name} {client.last_name}
          </p>
          <p className="text-xs text-muted-foreground">{client.email || "Нет email"}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Статус",
      render: (client: Client) => <StatusBadge status={client.status} />,
    },
    {
      key: "source",
      header: "Источник",
      render: (client: Client) => <span className="text-sm">{client.source}</span>,
    },
    {
      key: "phone",
      header: "Телефон",
      render: (client: Client) => <span className="text-sm font-mono">{client.phone || "-"}</span>,
    },
    {
      key: "registrationDate",
      header: "Дата регистрации",
      render: (client: Client) => (
        <span className="text-sm text-muted-foreground">
          {new Date(client.registration_date).toLocaleDateString('ru-RU')}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Клиенты</h1>
          <p className="text-muted-foreground mt-1">
            Управление базой клиентов студии.
          </p>
        </div>
        
        {/* МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Добавить клиента
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый клиент</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fname">Имя *</Label>
                  <Input 
                    id="fname" 
                    value={newClient.first_name}
                    onChange={(e) => setNewClient({...newClient, first_name: e.target.value})}
                    placeholder="Иван" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lname">Фамилия *</Label>
                  <Input 
                    id="lname" 
                    value={newClient.last_name}
                    onChange={(e) => setNewClient({...newClient, last_name: e.target.value})}
                    placeholder="Иванов" 
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input 
                  id="phone" 
                  value={newClient.phone}
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  placeholder="+7..." 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  value={newClient.email}
                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                  placeholder="ivan@example.com" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => createClientMutation.mutate()} 
                disabled={!newClient.first_name || !newClient.last_name || createClientMutation.isPending}
              >
                {createClientMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск клиентов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Фильтры
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredClients}
          onRowClick={(client) => navigate(`/clients/${client.id}`)}
          emptyMessage="Клиенты не найдены."
        />
      )}
    </AdminLayout>
  );
};

export default Clients;