"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApartamento, useUpdateApartamento } from "@/services/apartamentos.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EditApartamentoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: apto, isLoading } = useApartamento(id);
  const updateMut = useUpdateApartamento();
  const [form, setForm] = useState({ numero: "", bloco: "", tipo: "padrao", status: "vazio", fracao_ideal: "", metragem: "", vaga_demarcada: "" });

  useEffect(() => {
    if (apto) {
      setForm({
        numero: apto.numero,
        bloco: apto.bloco || "",
        tipo: apto.tipo,
        status: apto.status,
        fracao_ideal: apto.fracao_ideal?.toString() || "",
        metragem: apto.metragem?.toString() || "",
        vaga_demarcada: apto.vaga_demarcada || "",
      });
    }
  }, [apto]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMut.mutateAsync({
        id,
        data: {
          numero: form.numero,
          bloco: form.bloco || null,
          tipo: form.tipo as any,
          status: form.status as any,
          fracao_ideal: form.fracao_ideal ? Number(form.fracao_ideal) : null,
          metragem: form.metragem ? Number(form.metragem) : null,
          vaga_demarcada: form.vaga_demarcada || null,
        },
      });
      toast.success("Apartamento atualizado");
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  if (isLoading) return <div className="space-y-4 max-w-lg"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>;

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/apartamentos"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Editar Apartamento</h1>
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
              <Button type="submit" disabled={updateMut.isPending}>Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
