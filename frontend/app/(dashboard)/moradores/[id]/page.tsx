"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useMorador, useUpdateMorador } from "@/services/moradores.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EditMoradorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: morador, isLoading } = useMorador(id);
  const updateMut = useUpdateMorador();
  const [form, setForm] = useState({ nome: "", cpf: "", telefone: "", email: "", veiculo: "", tipo: "morador" });

  useEffect(() => {
    if (morador) setForm({
      nome: morador.nome, cpf: morador.cpf || "", telefone: morador.telefone || "",
      email: morador.email || "", veiculo: morador.veiculo || "", tipo: morador.tipo,
    });
  }, [morador]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMut.mutateAsync({ id, data: { ...form, cpf: form.cpf || null, telefone: form.telefone || null, email: form.email || null, veiculo: form.veiculo || null, tipo: form.tipo as any } });
      toast.success("Morador atualizado");
    } catch { toast.error("Erro ao atualizar"); }
  };

  if (isLoading) return <div className="space-y-4 max-w-lg"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>;

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/moradores"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Editar Morador</h1>
      </div>
      <Card><CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nome</Label><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="space-y-2"><Label>CPF</Label><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Veículo</Label><Input value={form.veiculo} onChange={(e) => setForm({ ...form, veiculo: e.target.value })} /></div>
            <div className="space-y-2"><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morador">Morador</SelectItem>
                  <SelectItem value="inquilino">Inquilino</SelectItem>
                  <SelectItem value="dependente">Dependente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Link href="/moradores"><Button variant="outline" type="button">Cancelar</Button></Link>
            <Button type="submit" disabled={updateMut.isPending}>Salvar</Button>
          </div>
        </form>
      </CardContent></Card>
    </div>
  );
}
