"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateDespesa } from "@/services/despesas.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function NovaDespesaPage() {
  const router = useRouter();
  const createMut = useCreateDespesa();
  const [form, setForm] = useState({ descricao: "", tipo: "ordinaria", valor: "", competencia: "", status: "pendente", categoria: "", observacao: "", parcelamento: false, total_parcelas: "1" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMut.mutateAsync({
        descricao: form.descricao, tipo: form.tipo as any, valor: Number(form.valor), competencia: form.competencia,
        status: form.status as any, categoria: form.categoria || null, observacao: form.observacao || null,
        vencimento: null, data_pagamento: null,
        parcelamento: form.parcelamento && form.tipo === "extraordinaria",
        total_parcelas: form.parcelamento && form.tipo === "extraordinaria" ? Number(form.total_parcelas) : undefined,
      });
      toast.success("Despesa criada");
      router.push("/financeiro/despesas");
    } catch { toast.error("Erro ao criar despesa"); }
  };

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-2"><Link href="/financeiro/despesas"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link><h1 className="text-2xl font-bold">Nova Despesa</h1></div>
      <Card><CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Descrição</Label><Input required value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Tipo</Label><Select value={form.tipo} onValueChange={v => setForm({...form, tipo: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ordinaria">Ordinária</SelectItem><SelectItem value="extraordinaria">Extraordinária</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Valor (R$)</Label><Input required type="number" step="0.01" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Competência</Label><Input required type="date" value={form.competencia} onChange={e => setForm({...form, competencia: e.target.value})} /></div>
            <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="pago">Pago</SelectItem></SelectContent></Select></div>
          </div>
          {form.tipo === "extraordinaria" && (
            <div className="flex items-center gap-4 p-3 border rounded-md">
              <div className="flex-1"><Label>Parcelamento</Label><p className="text-xs text-muted-foreground">Dividir em parcelas mensais</p></div>
              <Switch checked={form.parcelamento} onCheckedChange={v => setForm({...form, parcelamento: v})} />
              {form.parcelamento && <Input type="number" min="2" max="36" className="w-20" value={form.total_parcelas} onChange={e => setForm({...form, total_parcelas: e.target.value})} />}
            </div>
          )}
          <div className="space-y-2"><Label>Categoria</Label><Input value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} /></div>
          <div className="space-y-2"><Label>Observação</Label><Input value={form.observacao} onChange={e => setForm({...form, observacao: e.target.value})} /></div>
          <div className="flex gap-2 justify-end"><Link href="/financeiro/despesas"><Button variant="outline" type="button">Cancelar</Button></Link><Button type="submit" disabled={createMut.isPending}>Salvar</Button></div>
        </form>
      </CardContent></Card>
    </div>
  );
}
