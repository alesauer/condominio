"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateApartamento } from "@/services/apartamentos.service";
import { useMoradores } from "@/services/moradores.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { AdminGate, RestrictedPageNotice } from "@/components/auth/admin-gate";

export default function NovoApartamentoPage() {
  const router = useRouter();
  const createMut = useCreateApartamento();
  const { data: moradoresData } = useMoradores({ page_size: 200 });
  const [form, setForm] = useState({
    numero: "",
    bloco: "",
    tipo: "padrao",
    status: "vazio",
    fracao_ideal: "",
    metragem: "",
    vaga_demarcada: "",
    proprietario_id: "",
    responsavel_id: "",
  });

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
        proprietario_id: form.proprietario_id && form.proprietario_id !== "none" ? form.proprietario_id : null,
        responsavel_id: form.responsavel_id && form.responsavel_id !== "none" ? form.responsavel_id : null,
      });
      toast.success("Apartamento criado com sucesso!");
      router.push("/apartamentos");
    } catch {
      toast.error("Erro ao criar apartamento");
    }
  };

  return (
    <AdminGate fallback={<RestrictedPageNotice backHref="/apartamentos" backLabel="Voltar para Apartamentos" />}>
      <div className="max-w-xl space-y-4">
        <div className="flex items-center gap-2">
        <Link href="/apartamentos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo Apartamento</h1>
          <p className="text-sm text-muted-foreground">Cadastre uma nova unidade autônoma no condomínio</p>
        </div>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Dados da Unidade</CardTitle>
              <CardDescription>Identificação, tipo, proprietário e responsável administrativo</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero">Número *</Label>
                <Input
                  id="numero"
                  required
                  placeholder="Ex: 101"
                  value={form.numero}
                  onChange={(e) => setForm({ ...form, numero: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bloco">Bloco / Torre</Label>
                <Input
                  id="bloco"
                  placeholder="Ex: A"
                  value={form.bloco}
                  onChange={(e) => setForm({ ...form, bloco: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="padrao">Padrão</SelectItem>
                    <SelectItem value="area_privativa">Área Privativa</SelectItem>
                    <SelectItem value="cobertura">Cobertura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ocupado">Ocupado</SelectItem>
                    <SelectItem value="vazio">Vazio (Livre)</SelectItem>
                    <SelectItem value="alugado">Alugado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="proprietario">Proprietário</Label>
                <Select
                  value={form.proprietario_id}
                  onValueChange={(v) => setForm({ ...form, proprietario_id: v })}
                >
                  <SelectTrigger id="proprietario">
                    <SelectValue placeholder="Selecione o proprietário..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem proprietário vinculado</SelectItem>
                    {moradoresData?.items.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome} ({m.tipo.toUpperCase()}) {m.cpf ? `- CPF: ${m.cpf}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsavel">Resp. Administrativo</Label>
                <Select
                  value={form.responsavel_id}
                  onValueChange={(v) => setForm({ ...form, responsavel_id: v })}
                >
                  <SelectTrigger id="responsavel">
                    <SelectValue placeholder="Selecione o responsável..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não definido</SelectItem>
                    {moradoresData?.items.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome} ({m.tipo.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="metragem">Metragem (m²)</Label>
                <Input
                  id="metragem"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 85.50"
                  value={form.metragem}
                  onChange={(e) => setForm({ ...form, metragem: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fracao_ideal">Fração Ideal</Label>
                <Input
                  id="fracao_ideal"
                  type="number"
                  step="0.000001"
                  placeholder="Ex: 0.121426"
                  value={form.fracao_ideal}
                  onChange={(e) => setForm({ ...form, fracao_ideal: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vaga_demarcada">Vaga de Garagem</Label>
              <Input
                id="vaga_demarcada"
                placeholder="Ex: Vaga 01 (G1)"
                value={form.vaga_demarcada}
                onChange={(e) => setForm({ ...form, vaga_demarcada: e.target.value })}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Link href="/apartamentos">
                <Button variant="outline" type="button">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "Criando..." : "Salvar Apartamento"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
    </AdminGate>
  );
}
