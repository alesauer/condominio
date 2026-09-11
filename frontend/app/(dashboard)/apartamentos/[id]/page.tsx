"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApartamento, useUpdateApartamento, useApartamentoMoradores } from "@/services/apartamentos.service";
import { useMoradores, useVincularApartamento, useDesvincularApartamento } from "@/services/moradores.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Building2, Users, PlusCircle, Trash2, Phone, Mail } from "lucide-react";
import Link from "next/link";

const tipoLabel: Record<string, string> = {
  proprietario: "Proprietário",
  inquilino: "Inquilino",
  morador: "Morador",
  dependente: "Dependente",
};

export default function EditApartamentoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: apto, isLoading, refetch: refetchApto } = useApartamento(id);
  const { data: moradoresApto, refetch: refetchMoradoresApto } = useApartamentoMoradores(id);
  const { data: todosMoradores } = useMoradores({ page_size: 200 });

  const updateMut = useUpdateApartamento();
  const vincularMut = useVincularApartamento();
  const desvincularMut = useDesvincularApartamento();

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

  const [selectedMoradorToLink, setSelectedMoradorToLink] = useState("");
  const [definirComoResp, setDefinirComoResp] = useState(false);

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
        proprietario_id: apto.proprietario_id || "",
        responsavel_id: apto.responsavel_id || "",
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
          proprietario_id: form.proprietario_id && form.proprietario_id !== "none" ? form.proprietario_id : null,
          responsavel_id: form.responsavel_id && form.responsavel_id !== "none" ? form.responsavel_id : null,
        },
      });
      await refetchApto();
      toast.success("Apartamento atualizado com sucesso!");
    } catch {
      toast.error("Erro ao atualizar apartamento");
    }
  };

  const handleSetResponsavelQuick = async (moradorId: string, nome: string) => {
    try {
      await updateMut.mutateAsync({
        id,
        data: {
          responsavel_id: moradorId,
        },
      });
      setForm((prev) => ({ ...prev, responsavel_id: moradorId }));
      await refetchApto();
      toast.success(`${nome} agora é o responsável administrativo pelo apartamento!`);
    } catch {
      toast.error("Erro ao definir responsável administrativo");
    }
  };

  const handleLinkMorador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMoradorToLink) return;

    try {
      await vincularMut.mutateAsync({
        moradorId: selectedMoradorToLink,
        data: {
          apartamento_id: id,
          tipo_vinculo: "residente",
          definir_como_responsavel: definirComoResp,
        },
      });
      if (definirComoResp) {
        setForm((prev) => ({ ...prev, responsavel_id: selectedMoradorToLink }));
        await refetchApto();
      }
      await refetchMoradoresApto();
      setSelectedMoradorToLink("");
      setDefinirComoResp(false);
      toast.success("Morador vinculado com sucesso!");
    } catch {
      toast.error("Erro ao vincular morador");
    }
  };

  const handleUnlinkMorador = async (moradorId: string, nome: string) => {
    if (!confirm(`Deseja desvincular ${nome} deste apartamento?`)) return;

    try {
      await desvincularMut.mutateAsync({
        moradorId,
        apartamentoId: id,
      });
      await refetchMoradoresApto();
      toast.success(`${nome} desvinculado com sucesso!`);
    } catch {
      toast.error("Erro ao desvincular morador");
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
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
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
            Edição de dados da unidade, proprietário e lista de moradores residentes
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
                  <CardDescription>Características e proprietário responsável</CardDescription>
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
                        {todosMoradores?.items.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nome} ({m.tipo.toUpperCase()}) {m.cpf ? `- CPF: ${m.cpf}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="responsavel">Responsável Administrativo / Financeiro</Label>
                    <Select
                      value={form.responsavel_id}
                      onValueChange={(v) => setForm({ ...form, responsavel_id: v })}
                    >
                      <SelectTrigger id="responsavel">
                        <SelectValue placeholder="Selecione o responsável..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não definido</SelectItem>
                        {todosMoradores?.items.map((m) => (
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

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={updateMut.isPending}>
                    {updateMut.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Moradores Residentes da Unidade */}
        <div className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Moradores / Residentes</CardTitle>
                  <CardDescription>Pessoas que residem nesta unidade</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista dos residentes */}
              <div className="space-y-2">
                {moradoresApto && moradoresApto.length > 0 ? (
                  moradoresApto.map((m) => {
                    const isResp = form.responsavel_id === m.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-all ${
                          isResp ? "bg-emerald-500/10 border-emerald-500/30" : "bg-muted/30"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <span>{m.nome}</span>
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
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!isResp && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetResponsavelQuick(m.id, m.nome)}
                              title="Tornar este morador o responsável administrativo"
                              className="h-8 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
                            >
                              Tornar Resp.
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUnlinkMorador(m.id, m.nome)}
                            title="Desvincular deste apartamento"
                            disabled={desvincularMut.isPending}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                    Nenhum morador residente registrado neste apartamento.
                  </div>
                )}
              </div>

              {/* Form para vincular novo morador */}
              <form onSubmit={handleLinkMorador} className="pt-3 border-t space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Adicionar Morador Residente
                </Label>

                <div className="space-y-2">
                  <Select
                    value={selectedMoradorToLink}
                    onValueChange={(v) => setSelectedMoradorToLink(v)}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Selecione um morador..." />
                    </SelectTrigger>
                    <SelectContent>
                      {todosMoradores?.items?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nome} ({tipoLabel[m.tipo] || m.tipo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="definirComoResp"
                    checked={definirComoResp}
                    onChange={(e) => setDefinirComoResp(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="definirComoResp" className="text-xs font-normal cursor-pointer">
                    Definir como Responsável Administrativo / Financeiro
                  </Label>
                </div>

                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={!selectedMoradorToLink || vincularMut.isPending}
                  className="w-full text-xs"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                  {vincularMut.isPending ? "Vinculando..." : "Adicionar à Unidade"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
