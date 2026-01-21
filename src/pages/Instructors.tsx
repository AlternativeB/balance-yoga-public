import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Ваш компонент
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Edit, Trash2, Link as LinkIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface Instructor {
  id: string;
  first_name: string;
  last_name: string;
  specialization: string[];
  bio: string;
  photo_url: string;
  status: "active" | "archived";
}

const Instructors = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Состояние формы (добавили bio и photo_url)
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    specialization: "",
    bio: "",
    photo_url: ""
  });

  // 1. ЗАГРУЗКА
  const { data: instructors = [], isLoading } = useQuery({
    queryKey: ['instructors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instructors')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Instructor[];
    }
  });

  // 2. СОХРАНЕНИЕ (Создание или Обновление)
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Валидация
      if (!formData.first_name || !formData.last_name) {
        throw new Error("Имя и Фамилия обязательны!");
      }

      const specArray = formData.specialization
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        specialization: specArray,
        bio: formData.bio,
        photo_url: formData.photo_url,
        status: 'active'
      };

      if (editingId) {
        // UPDATE
        const { error } = await supabase.from('instructors').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        // INSERT
        const { error } = await supabase.from('instructors').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      setIsDialogOpen(false);
      toast({ title: "Успешно!", description: editingId ? "Обновлено." : "Создано." });
    },
    onError: (error) => alert(error.message)
  });

  // 3. УДАЛЕНИЕ
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('instructors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      setIsDialogOpen(false);
      toast({ title: "Удалено" });
    },
  });

  // ОТКРЫТИЕ НА СОЗДАНИЕ
  const openCreateDialog = () => {
    setEditingId(null);
    setFormData({ first_name: "", last_name: "", specialization: "", bio: "", photo_url: "" });
    setIsDialogOpen(true);
  };

  // ОТКРЫТИЕ НА РЕДАКТИРОВАНИЕ
  const openEditDialog = (inst: Instructor) => {
    setFormData({
      first_name: inst.first_name,
      last_name: inst.last_name,
      specialization: inst.specialization?.join(', ') || "",
      bio: inst.bio || "",
      photo_url: inst.photo_url || ""
    });
    setEditingId(inst.id);
    setIsDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Инструкторы</h1>
          <p className="text-muted-foreground mt-1">Команда студии.</p>
        </div>
        <Button className="gap-2" onClick={openCreateDialog}>
          <Plus className="w-4 h-4" /> Добавить
        </Button>

        {/* МОДАЛЬНОЕ ОКНО */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Редактировать" : "Новый инструктор"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Имя *</Label>
                  <Input value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label>Фамилия *</Label>
                  <Input value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label>Специализация (через запятую)</Label>
                <Input 
                  value={formData.specialization} 
                  onChange={(e) => setFormData({...formData, specialization: e.target.value})} 
                  placeholder="Йога, Пилатес, Растяжка"
                />
              </div>

              <div className="grid gap-2">
                <Label>Ссылка на фото (URL)</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    className="pl-9"
                    value={formData.photo_url} 
                    onChange={(e) => setFormData({...formData, photo_url: e.target.value})} 
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>О себе (Био)</Label>
                <Textarea 
                  value={formData.bio} 
                  onChange={(e) => setFormData({...formData, bio: e.target.value})} 
                  placeholder="Опыт работы, подход к тренировкам..."
                  className="h-24 resize-none"
                />
              </div>
            </div>
            <DialogFooter className="flex justify-between sm:justify-between">
              {editingId && (
                <Button variant="destructive" size="icon" onClick={() => { if(confirm("Удалить?")) deleteMutation.mutate(editingId) }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>}

      {/* СПИСОК КАРТОЧЕК */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!isLoading && instructors.map((instructor) => (
          <Card key={instructor.id} className="overflow-hidden hover:shadow-md transition-all group relative">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                {/* Аватарка: Если есть ссылка - показываем фото, иначе буквы */}
                {instructor.photo_url ? (
                  <img 
                    src={instructor.photo_url} 
                    alt={instructor.first_name} 
                    className="w-14 h-14 rounded-full object-cover bg-gray-100"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-serif font-medium text-primary uppercase">
                    {instructor.first_name?.[0]}{instructor.last_name?.[0]}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-lg leading-tight truncate">
                    {instructor.first_name} {instructor.last_name}
                  </h3>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {instructor.specialization?.slice(0, 3).map((spec) => (
                      <span key={spec} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-3 mb-2 h-[60px]">
                {instructor.bio || "Описание не заполнено."}
              </p>
              
              {/* Кнопка редактирования */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(instructor)}>
                   <Edit className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
};

export default Instructors;