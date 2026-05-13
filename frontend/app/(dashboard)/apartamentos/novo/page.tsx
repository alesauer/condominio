"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateApartamento } from "@/services/apartamentos.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NovoApartamentoPage() {
  const router = useRouter();
  const createMut = useCreateApartamento();
  const [form, setForm] = useState({ numero: "", bloco: "", tipo: "padrao", status: "vazio", fracao_ideal: "", metragem: "", vaga_demarcada: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMut.mutateAsync({
        numero: form.numero,
        bloco: form.bloco || null,
        tipo: form.tipo as any,
        status: form.status as any,
        fracao_ideal: form.fracao_ideal ? Number(form.fracao_ideal) : null,
        metragem: form.metragem ? Number(form.metragem) : null,
        vaga_demarcada: form.vaga_demarcada || null,
      });
      toast.success("Apartamento criado");
      router.push("/apartamentos");
    } catch {
      toast.error("Erro ao criar apartamento");
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/apartamentos"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Novo Apartamento</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número</Label>
                <Input required value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Bloco</Label>
                <Input value={form.bloco} onChange={(e) => setForm({ ...form, bloco: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="padrao">Padrão</SelectItem>
                    <SelectItem value="area_privativa">Área Privativa</SelectItem>
                    <SelectItem value="cobertura">Cobertura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ocupado">Ocupado</SelectItem>
                    <SelectItem value="vazio">Vazio</SelectItem>
                    <SelectItem value="alugado">Alugado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Metragem (m²)</Label>
                <Input type="number" step="0.01" value={form.metragem} onChange={(e) => setForm({ ...form, metragem: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fração Ideal</Label>
                <Input type="number" step="0.0001" value={form.fracao_ideal} onChange={(e) => setForm({ ...form, fracao_ideal: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vaga Demarcada</Label>
              <Input value={form.vaga_demarcada} onChange={(e) => setForm({ ...form, vaga_demarcada: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end">
              <Link href="/apartamentos"><Button variant="outline" type="button">Cancelar</Button></Link>
              <Button type="submit" disabled={createMut.isPending}>Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
