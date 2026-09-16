"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApartamento, useUpdateApartamento, useApartamentoMoradores } from "@/services/apartamentos.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Building2, Users, ShieldCheck, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { ReadOnlyNotice } from "@/components/auth/admin-gate";

const tipoLabel: Record<string, string> = {
  proprietario: "Proprietário",
  inquilino: "Inquilino",
  morador: "Morador",
  dependente: "Dependente",
};

export default function EditApartamentoPage() {
  const { isAdmin } = useAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: apto, isLoading, refetch: refetchApto } = useApartamento(id);
  const { data: moradoresApto } = useApartamentoMoradores(id);

  const updateMut = useUpdateApartamento();

  const [form, setForm] = useState({
    numero: "",
    bloco: "",
    tipo: "padrao",
    status: "vazio",
    fracao_ideal: "",
    metragem: "",
    vaga_demarcada: "",
  });

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
      await refetchApto();
      toast.success("Apartamento atualizado com sucesso!");
    } catch {
      toast.error("Erro ao atualizar apartamento");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!apto) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Apartamento não encontrado.</p>
        <Link href="/apartamentos">
          <Button variant="outline" className="mt-4">
            Voltar para Apartamentos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReadOnlyNotice />

      <div className="flex items-center gap-4">
        <Link href="/apartamentos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Apartamento {apto.numero} {apto.bloco ? `(Bloco ${apto.bloco})` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Edição de características da unidade física" : "Visualização de características da unidade física"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Dados do Imóvel</CardTitle>
                  <CardDescription>Características físicas e cadastrais da unidade</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      required
                      value={form.numero}
                      onChange={(e) => setForm({ ...form, numero: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bloco">Bloco</Label>
                    <Input
                      id="bloco"
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

                {/* Dica de Faturamento Legal para Imóvel Alugado */}
                {form.status === "alugado" && (
                  <div className="p-3 rounded-lg border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/30 text-xs space-y-1">
                    <div className="font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      Regra de Cobrança Legal (Lei do Inquilinato nº 8.245/91):
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      Ao gerar o lote mensal de cobranças, o sistema pode separar automaticamente as <strong>Despesas Ordinárias + Consumos (Água/Gás)</strong> para o Inquilino e o <strong>Fundo de Reserva / Obras</strong> para o Proprietário.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="metragem">Metragem (m²)</Label>
                    <Input
                      id="metragem"
                      type="number"
                      step="0.01"
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
                      value={form.fracao_ideal}
                      onChange={(e) => setForm({ ...form, fracao_ideal: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vaga_demarcada">Vaga Demarcada</Label>
                  <Input
                    id="vaga_demarcada"
                    value={form.vaga_demarcada}
                    onChange={(e) => setForm({ ...form, vaga_demarcada: e.target.value })}
                  />
                </div>

                {isAdmin && (
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={updateMut.isPending}>
                      {updateMut.isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Moradores Residentes da Unidade (Apenas Visualização) */}
        <div className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Moradores / Residentes</CardTitle>
                  <CardDescription>Pessoas vinculadas a esta unidade</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista dos residentes */}
              <div className="space-y-2">
                {moradoresApto && moradoresApto.length > 0 ? (
                  moradoresApto.map((m) => {
                    const isResp = apto?.responsavel_id === m.id;
                    const isProp = apto?.proprietario_id === m.id || m.tipo === "proprietario";
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-all ${
                          isResp ? "bg-emerald-500/10 border-emerald-500/30" : "bg-muted/30"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <Link
                              href={`/moradores/${m.id}`}
                              className="hover:underline flex items-center gap-1 text-foreground"
                            >
                              <span>{m.nome}</span>
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </Link>
                            {isProp && (
                              <Badge variant="outline" className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px] py-0 px-1.5 font-medium">
                                Proprietário
                              </Badge>
                            )}
                            {isResp && (
                              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] py-0 px-1.5 font-medium">
                                Resp. Financeiro
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {tipoLabel[m.tipo] || m.tipo}
                            </Badge>
                            {m.telefone && <span>{m.telefone}</span>}
                            {m.email && <span>{m.email}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground space-y-1">
                    <p>Nenhum morador residente registrado nesta unidade.</p>
                  </div>
                )}
              </div>

              {/* Informação e Redirecionamento para o Módulo de Moradores */}
              <div className="pt-3 border-t space-y-2">
                <div className="p-3 rounded-lg bg-muted/40 border text-xs text-muted-foreground space-y-2">
                  <p>
                    A vinculação, cadastro e gestão de moradores é feita diretamente no módulo de <strong>Moradores</strong>.
                  </p>
                  <Link href="/moradores">
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 mt-1">
                      <span>Acessar Módulo de Moradores</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


