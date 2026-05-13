"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function NovaAssembleiaPage() {
  const router = useRouter();
  const [form, setForm] = useState({ data: "", titulo: "", descricao: "", local: "", hora_inicio: "", hora_fim: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await api.post("/assembleias", { ...form, hora_inicio: form.hora_inicio || null, hora_fim: form.hora_fim || null }); toast.success("Assembleia criada"); router.push("/assembleias"); }
    catch { toast.error("Erro"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-2"><Link href="/assembleias"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link><h1 className="text-2xl font-bold">Nova Assembleia</h1></div>
      <Card><CardContent className="pt-6"><form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2"><Label>Título</Label><Input required value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Data</Label><Input required type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} /></div>
          <div className="space-y-2"><Label>Local</Label><Input value={form.local} onChange={e => setForm({...form, local: e.target.value})} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Horário Início</Label><Input type="time" value={form.hora_inicio} onChange={e => setForm({...form, hora_inicio: e.target.value})} /></div>
          <div className="space-y-2"><Label>Horário Fim</Label><Input type="time" value={form.hora_fim} onChange={e => setForm({...form, hora_fim: e.target.value})} /></div>
        </div>
        <div className="space-y-2"><Label>Descrição</Label><textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} /></div>
        <div className="flex gap-2 justify-end"><Link href="/assembleias"><Button variant="outline" type="button">Cancelar</Button></Link><Button type="submit" disabled={loading}>Criar</Button></div>
      </form></CardContent></Card>
    </div>
  );
}
