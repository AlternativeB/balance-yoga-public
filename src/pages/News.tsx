import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Megaphone } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const News = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({ title: "", content: "" });

  const { data: newsList = [], isLoading } = useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      const { data, error } = await supabase.from('news').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('news').insert([formData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
      setIsDialogOpen(false);
      setFormData({ title: "", content: "" });
      toast({ title: "Новость опубликована!" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('news').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
      toast({ title: "Удалено" });
    }
  });

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Новости и Акции</h1>
          <p className="text-muted-foreground mt-1">Отображаются на главной в приложении.</p>
        </div>
        <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4" /> Добавить новость
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Новая публикация</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Заголовок (Акция)</Label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Скидка 20% на безлимит!" />
              </div>
              <div className="grid gap-2">
                <Label>Текст</Label>
                <Textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="Подробности..." />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Опубликовать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {newsList.map((item: any) => (
          <Card key={item.id}>
            <CardContent className="p-6 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Megaphone className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{format(new Date(item.created_at), "dd.MM.yyyy")}</span>
                </div>
                <h3 className="font-bold text-lg">{item.title}</h3>
                <p className="text-muted-foreground mt-1">{item.content}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => {if(confirm("Удалить новость?")) deleteMutation.mutate(item.id)}}>
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
};

export default News;