"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateProprietario } from "@/services/proprietarios.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NovoProprietarioPage() {
  const router = useRouter();
  const createMut = useCreateProprietario();
  const [form, setForm] = useState({ nome: "", cpf: "", telefone: "", email: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMut.mutateAsync({ nome: form.nome, cpf: form.cpf, telefone: form.telefone || null, email: form.email || null });
      toast.success("Proprietário criado");
      router.push("/proprietarios");
    } catch { toast.error("Erro ao criar proprietário"); }
  };

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/proprietarios"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Novo Proprietário</h1>
      </div>
      <Card><CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Nome</Label><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div className="space-y-2"><Label>CPF</Label><Input required value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Link href="/proprietarios"><Button variant="outline" type="button">Cancelar</Button></Link>
            <Button type="submit" disabled={createMut.isPending}>Salvar</Button>
          </div>
        </form>
      </CardContent></Card>
    </div>
  );
}
