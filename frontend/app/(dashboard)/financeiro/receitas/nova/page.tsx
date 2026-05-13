"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateReceita } from "@/services/receitas.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function NovaReceitaPage() {
  const router = useRouter();
  const createMut = useCreateReceita();
  const [form, setForm] = useState({ descricao: "", tipo: "condominio", valor: "", competencia: "", status: "pendente", categoria: "", observacao: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMut.mutateAsync({ descricao: form.descricao, tipo: form.tipo as any, valor: Number(form.valor), competencia: form.competencia, status: form.status as any, categoria: form.categoria || null, observacao: form.observacao || null, vencimento: null, data_recebimento: null, apartamento_id: null });
      toast.success("Receita criada");
      router.push("/financeiro/receitas");
    } catch { toast.error("Erro ao criar receita"); }
  };

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-2"><Link href="/financeiro/receitas"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link><h1 className="text-2xl font-bold">Nova Receita</h1></div>
      <Card><CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Descrição</Label><Input required value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Tipo</Label><Select value={form.tipo} onValueChange={v => setForm({...form, tipo: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="condominio">Condomínio</SelectItem><SelectItem value="fundo_reserva">Fundo Reserva</SelectItem><SelectItem value="taxa_extra">Taxa Extra</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Valor (R$)</Label><Input required type="number" step="0.01" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Competência</Label><Input required type="date" value={form.competencia} onChange={e => setForm({...form, competencia: e.target.value})} /></div>
            <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="pago">Pago</SelectItem></SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label>Categoria</Label><Input value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} /></div>
          <div className="space-y-2"><Label>Observação</Label><Input value={form.observacao} onChange={e => setForm({...form, observacao: e.target.value})} /></div>
          <div className="flex gap-2 justify-end"><Link href="/financeiro/receitas"><Button variant="outline" type="button">Cancelar</Button></Link><Button type="submit" disabled={createMut.isPending}>Salvar</Button></div>
        </form>
      </CardContent></Card>
    </div>
  );
}
