"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function NovoAvisoPage() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState("baixa");
  const [enviarEmail, setEnviarEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await api.post("/avisos", { titulo, descricao, prioridade, enviar_email: enviarEmail }); toast.success("Aviso criado"); router.push("/avisos"); }
    catch { toast.error("Erro ao criar aviso"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-2"><Link href="/avisos"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link><h1 className="text-2xl font-bold">Novo Aviso</h1></div>
      <Card><CardContent className="pt-6"><form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2"><Label>Título</Label><Input required value={titulo} onChange={e => setTitulo(e.target.value)} /></div>
        <div className="space-y-2"><Label>Descrição</Label><textarea className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required value={descricao} onChange={e => setDescricao(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Prioridade</Label><Select value={prioridade} onValueChange={setPrioridade}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent></Select></div>
          <div className="flex items-end pb-2"><label className="flex items-center gap-2"><input type="checkbox" checked={enviarEmail} onChange={e => setEnviarEmail(e.target.checked)} /> <span className="text-sm">Enviar por email</span></label></div>
        </div>
        <div className="flex gap-2 justify-end"><Link href="/avisos"><Button variant="outline" type="button">Cancelar</Button></Link><Button type="submit" disabled={loading}>Publicar</Button></div>
      </form></CardContent></Card>
    </div>
  );
}
