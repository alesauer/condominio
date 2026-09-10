"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateMorador } from "@/services/moradores.service";
import { useApartamentos } from "@/services/apartamentos.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, UserPlus, Building2 } from "lucide-react";
import Link from "next/link";

export default function NovoMoradorPage() {
  const router = useRouter();
  const createMut = useCreateMorador();
  const { data: aptosData } = useApartamentos({ page_size: 100 });

  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    email: "",
    veiculo: "",
    tipo: "morador",
    apartamento_id: "",
    definir_como_responsavel: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMut.mutateAsync({
        nome: form.nome,
        cpf: form.cpf || null,
        telefone: form.telefone || null,
        email: form.email || null,
        veiculo: form.veiculo || null,
        tipo: form.tipo as any,
        apartamento_id: form.apartamento_id || null,
        definir_como_responsavel: form.definir_como_responsavel,
      });
      toast.success("Cadastro realizado com sucesso!");
      router.push("/moradores");
    } catch {
      toast.error("Erro ao cadastrar morador/proprietário");
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/moradores">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo Morador / Proprietário</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre uma nova pessoa e defina seu perfil e vínculo inicial com um apartamento
          </p>
        </div>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Dados Pessoais</CardTitle>
              <CardDescription>Preencha as informações cadastrais e de contato</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  required
                  placeholder="Ex: Alexandre Sauer"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                <Input
                  id="telefone"
                  placeholder="(31) 99999-9999"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Cadastro *</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm({ ...form, tipo: v })}
                >
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proprietario">Proprietário</SelectItem>
                    <SelectItem value="inquilino">Inquilino</SelectItem>
                    <SelectItem value="morador">Morador</SelectItem>
                    <SelectItem value="dependente">Dependente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="veiculo">Veículo (Placa / Modelo)</Label>
                <Input
                  id="veiculo"
                  placeholder="Ex: ABC-1234 (Civic Prata)"
                  value={form.veiculo}
                  onChange={(e) => setForm({ ...form, veiculo: e.target.value })}
                />
              </div>
            </div>

            {/* Apartamento Vinculado */}
            <div className="pt-2 border-t space-y-2">
              <Label htmlFor="apartamento" className="flex items-center gap-1.5 font-medium">
                <Building2 className="h-4 w-4 text-primary" />
                Vincular a um Apartamento (Opcional)
              </Label>
              <Select
                value={form.apartamento_id}
                onValueChange={(v) => setForm({ ...form, apartamento_id: v === "none" ? "" : v })}
              >
                <SelectTrigger id="apartamento">
                  <SelectValue placeholder="Selecione um apartamento..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum vínculo inicial</SelectItem>
                  {aptosData?.items?.map((apto) => (
                    <SelectItem key={apto.id} value={apto.id}>
                      Apartamento {apto.numero} {apto.bloco ? `(Bloco ${apto.bloco})` : ""} - {apto.tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.apartamento_id && form.apartamento_id !== "none" && (
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="definirComoRespNovo"
                    checked={form.definir_como_responsavel}
                    onChange={(e) => setForm({ ...form, definir_como_responsavel: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="definirComoRespNovo" className="text-xs font-normal cursor-pointer">
                    Definir como Responsável Administrativo / Financeiro deste apartamento
                  </Label>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {form.tipo === "proprietario"
                  ? "Ao vincular como proprietário, este morador será definido como o dono da unidade."
                  : "Ao vincular como morador/inquilino, ele será adicionado à lista de residentes desta unidade."}
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Link href="/moradores">
                <Button variant="outline" type="button">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "Cadastrando..." : "Salvar Cadastro"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
