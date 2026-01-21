import { useState } from "react";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Loader2, User } from "lucide-react";
import { Link } from "react-router-dom";

const ClientInstructors = () => {
  const { data: instructors = [], isLoading } = useQuery({
    queryKey: ['public_instructors'],
    queryFn: async () => {
      const { data } = await supabase.from('instructors').select('*').eq('status', 'active');
      return data || [];
    }
  });

  return (
    <ClientLayout>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold font-serif">Наши тренеры</h2>

        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {instructors.map((inst: any) => (
              <Sheet key={inst.id}>
                <SheetTrigger asChild>
                  <Card className="cursor-pointer hover:shadow-md transition-all overflow-hidden border-none shadow-sm group">
                    {/* Фото или Заглушка */}
                    <div className="h-32 bg-gray-100 flex items-center justify-center text-gray-300 relative overflow-hidden">
                       {inst.photo_url ? (
                         <img src={inst.photo_url} alt={inst.first_name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                       ) : (
                         <User className="w-12 h-12" />
                       )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-bold text-sm truncate">{inst.first_name} {inst.last_name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {inst.specialization?.slice(0, 1).map((spec: string) => (
                          <span key={spec} className="text-[10px] text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl pt-10">
                  <div className="flex flex-col h-full overflow-y-auto pb-6 no-scrollbar">
                    {/* Аватар в шторке */}
                    <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto flex items-center justify-center text-gray-400 mb-4 overflow-hidden border-4 border-white shadow-lg">
                       {inst.photo_url ? (
                         <img src={inst.photo_url} className="w-full h-full object-cover" />
                       ) : (
                         <User className="w-10 h-10" />
                       )}
                    </div>
                    
                    <h2 className="text-2xl font-bold text-center">{inst.first_name} {inst.last_name}</h2>
                    
                    <div className="flex flex-wrap gap-2 justify-center mt-3 mb-6">
                      {inst.specialization?.map((spec: string) => (
                        <span key={spec} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                          {spec}
                        </span>
                      ))}
                    </div>

                    <div className="prose prose-sm text-gray-600 mb-8 px-2">
                       <h4 className="text-gray-900 font-bold mb-2 text-lg">О тренере</h4>
                       <p className="whitespace-pre-wrap leading-relaxed">{inst.bio || "Информация уточняется."}</p>
                    </div>

                    <div className="mt-auto sticky bottom-0 bg-white p-4 border-t">
                      <Link to="/portal/schedule">
                        <Button className="w-full h-12 text-base shadow-lg">Записаться к тренеру</Button>
                      </Link>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
};

export default ClientInstructors;