import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const ClientLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Состояние для "Забыл пароль"
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: ""
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // РЕГИСТРАЦИЯ
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.first_name,
              last_name: formData.last_name,
              phone: formData.phone,
            }
          }
        });
        if (error) throw error;
        toast({ title: "Успешно!", description: "Аккаунт создан." });
        navigate("/portal");
      } else {
        // ВХОД
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        navigate("/portal");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Ошибка", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) return toast({ variant: "destructive", title: "Введите Email" });
    setLoading(true);
    try {
      // Supabase отправит письмо со ссылкой на сброс
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin + '/portal/update-password', // Нужно будет создать этот роут
      });
      if (error) throw error;
      toast({ title: "Письмо отправлено", description: "Проверьте почту для сброса пароля." });
      setIsForgotOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Ошибка", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-3 font-serif font-bold text-xl">B</div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isSignUp ? "Регистрация" : "Balance Yoga"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
             {isSignUp ? "Создайте аккаунт для записи" : "Вход для клиентов"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Имя</Label><Input required value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} /></div>
                <div className="space-y-2"><Label>Фамилия</Label><Input required value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} /></div>
              </div>
              <div className="space-y-2"><Label>Телефон</Label><Input required type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} /></div>
            </>
          )}

          <div className="space-y-2">
            <Label>Email</Label>
            <Input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Пароль</Label>
              {!isSignUp && (
                <button type="button" onClick={() => setIsForgotOpen(true)} className="text-xs text-primary hover:underline">
                  Забыли пароль?
                </button>
              )}
            </div>
            <Input required type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
          </div>

          <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSignUp ? "Создать аккаунт" : "Войти"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-500">
            {isSignUp ? "Уже есть аккаунт?" : "Впервые у нас?"}
          </span>{" "}
          <button onClick={() => setIsSignUp(!isSignUp)} className="font-medium text-primary hover:underline">
            {isSignUp ? "Войти" : "Регистрация"}
          </button>
        </div>
        
        <div className="mt-8 pt-6 border-t text-center">
            <Link to="/login" className="text-xs text-muted-foreground hover:text-primary">
                Вход для администраторов
            </Link>
        </div>
      </div>

      {/* Модалка восстановления пароля */}
      <Dialog open={isForgotOpen} onOpenChange={setIsForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Восстановление пароля</DialogTitle>
            <DialogDescription>Введите ваш Email, и мы отправим ссылку для сброса.</DialogDescription>
          </DialogHeader>
          <Input 
            placeholder="example@mail.com" 
            value={resetEmail} 
            onChange={(e) => setResetEmail(e.target.value)} 
          />
          <DialogFooter>
            <Button onClick={handleResetPassword} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Отправить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientLogin;