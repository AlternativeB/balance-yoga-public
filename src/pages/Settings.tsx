import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const Settings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    name: "Balance Yoga Studio",
    description: "",
    address: "",
    phone: "",
    instagram: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data } = await supabase.from('studio_info').select('*').single();
    if (data) setData({ 
        name: data.name || "", 
        description: data.description || "",
        address: data.address || "",
        phone: data.phone || "",
        instagram: data.instagram || ""
    });
  };

  const handleSave = async () => {
    setLoading(true);
    // id=1 всегда у нас единственная студия
    const { error } = await supabase.from('studio_info').update(data).eq('id', 1);
    setLoading(false);
    
    if (error) {
      toast({ variant: "destructive", title: "Ошибка", description: error.message });
    } else {
      toast({ title: "Сохранено!", description: "Информация в приложении обновлена." });
    }
  };

  return (
    <AdminLayout>
      <div className="page-header mb-6">
        <h1 className="page-title">Настройки студии</h1>
        <p className="text-muted-foreground">Информация отображается в приложении клиента.</p>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>О студии (Balance Yoga Studio)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={data.name} onChange={e => setData({...data, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Описание (О нас)</Label>
              <Textarea 
                className="h-32" 
                value={data.description} 
                onChange={e => setData({...data, description: e.target.value})} 
                placeholder="Расскажите о вашей студии..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Адрес</Label>
                 <Input value={data.address} onChange={e => setData({...data, address: e.target.value})} />
               </div>
               <div className="space-y-2">
                 <Label>Телефон</Label>
                 <Input value={data.phone} onChange={e => setData({...data, phone: e.target.value})} />
               </div>
            </div>
            <div className="space-y-2">
              <Label>Instagram (Никнейм)</Label>
              <Input value={data.instagram} onChange={e => setData({...data, instagram: e.target.value})} />
            </div>

            <Button onClick={handleSave} disabled={loading} className="mt-4">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Сохранить изменения
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Settings;