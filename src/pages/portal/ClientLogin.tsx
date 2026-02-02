import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Phone, Lock, User } from "lucide-react";

const ClientLogin = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Состояние формы
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(""); // Только для регистрации

  // --- ЛОГИКА АВТОРИЗАЦИИ ---
  const handleAuth = async (type: "login" | "register") => {
    setIsLoading(true);
    
    try {
      // 1. Очищаем телефон (оставляем только цифры)
      const cleanPhone = phone.replace(/\D/g, "");
      
      if (cleanPhone.length < 10) {
        toast.error("Введите корректный номер телефона");
        setIsLoading(false);
        return;
      }

      if (password.length < 6) {
        toast.error("Пароль должен быть не менее 6 символов");
        setIsLoading(false);
        return;
      }

      // 2. Генерируем "техническую" почту
      // Вход будет выглядеть как: 77011234567@balance.yoga
      const fakeEmail = `${cleanPhone}@balance.yoga`;

      if (type === "register") {
        // --- РЕГИСТРАЦИЯ ---
        const { data, error } = await supabase.auth.signUp({
          email: fakeEmail,
          password: password,
          options: {
            data: {
              // ВАЖНО: Отправляем чистый телефон в метаданные, 
              // чтобы SQL-триггер мог найти и склеить аккаунты
              phone: cleanPhone,
              full_name: fullName, 
            },
          },
        });

        if (error) throw error;
        
        // Если авто-вход не сработал сразу (редко, но бывает)
        if (!data.session) {
          toast.success("Регистрация успешна! Теперь войдите.");
        } else {
          toast.success("Добро пожаловать!");
          navigate("/portal");
        }

      } else {
        // --- ВХОД ---
        const { error } = await supabase.auth.signInWithPassword({
          email: fakeEmail,
          password: password,
        });
        
        if (error) throw error;
        toast.success("С возвращением!");
        navigate("/portal");
      }

    } catch (error: any) {
      console.error(error);
      let msg = error.message;
      if (msg.includes("Invalid login")) msg = "Неверный телефон или пароль";
      if (msg.includes("already registered")) msg = "Этот номер уже зарегистрирован. Попробуйте войти.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-100">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <User className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Balance Yoga</CardTitle>
          <CardDescription>Вход в личный кабинет</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>

            {/* ВХОД */}
            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <Label>Номер телефона</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="7701..." 
                    className="pl-9" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Пароль</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    type="password" 
                    placeholder="******" 
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button className="w-full" onClick={() => handleAuth("login")} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Войти"}
              </Button>
            </TabsContent>

            {/* РЕГИСТРАЦИЯ */}
            <TabsContent value="register" className="space-y-4">
               <div className="space-y-2">
                <Label>Ваше Имя</Label>
                <Input 
                  placeholder="Иван" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Номер телефона</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="7701..." 
                    className="pl-9" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Придумайте пароль</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    type="password" 
                    placeholder="Не менее 6 символов" 
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button className="w-full" onClick={() => handleAuth("register")} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Зарегистрироваться"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientLogin;