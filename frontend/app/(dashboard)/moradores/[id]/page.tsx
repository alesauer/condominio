"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useMorador,
  useUpdateMorador,
  useVincularApartamento,
  useDesvincularApartamento,
} from "@/services/moradores.service";
import { useApartamentos } from "@/services/apartamentos.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Building2, User, Link as LinkIcon, Trash2, PlusCircle, Check } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { ReadOnlyNotice } from "@/components/auth/admin-gate";

export default function EditMoradorPage() {
  const { isAdmin } = useAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: morador, isLoading, refetch } = useMorador(id);
  const { data: aptosData } = useApartamentos({ page_size: 100 });

  const updateMut = useUpdateMorador();
  const vincularMut = useVincularApartamento();
  const desvincularMut = useDesvincularApartamento();

  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    email: "",
    veiculo: "",
    tipo: "morador",
  });

  const [selectedApartamentoToLink, setSelectedApartamentoToLink] = useState("");
  const [tipoVinculoNovo, setTipoVinculoNovo] = useState<"residente" | "proprietario">("residente");
  const [definirComoResp, setDefinirComoResp] = useState(false);

  useEffect(() => {
    if (morador) {
      setForm({
        nome: morador.nome,
        cpf: morador.cpf || "",
        telefone: morador.telefone || "",
        email: morador.email || "",
        veiculo: morador.veiculo || "",
        tipo: morador.tipo,
      });
      setTipoVinculoNovo(morador.tipo === "proprietario" ? "proprietario" : "residente");
    }
  }, [morador]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMut.mutateAsync({
        id,
        data: {
          nome: form.nome,
          cpf: form.cpf || null,
          telefone: form.telefone || null,
          email: form.email || null,
          veiculo: form.veiculo || null,
          tipo: form.tipo as any,
        },
      });
      await refetch();
      toast.success("Cadastro atualizado com sucesso!");
    } catch {
      toast.error("Erro ao atualizar dados");
    }
  };

  const handleVincularApartamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApartamentoToLink) return;

    try {
      await vincularMut.mutateAsync({
        moradorId: id,
        data: {
          apartamento_id: selectedApartamentoToLink,
          tipo_vinculo: tipoVinculoNovo,
          definir_como_responsavel: definirComoResp,
        },
      });
      await refetch();
      setSelectedApartamentoToLink("");
      setDefinirComoResp(false);
      toast.success("Apartamento vinculado com sucesso!");
    } catch {
      toast.error("Erro ao vincular apartamento");
    }
  };

  const handleDesvincularApartamento = async (apartamentoId: string, numero: string) => {
    if (!confirm(`Deseja desvincular o Apartamento ${numero} deste morador?`)) return;

    try {
      await desvincularMut.mutateAsync({
        moradorId: id,
        apartamentoId,
      });
      await refetch();
      toast.success(`Apartamento ${numero} desvinculado com sucesso!`);
    } catch {
      toast.error("Erro ao desvincular apartamento");
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

  if (!morador) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Morador não encontrado.</p>
        <Link href="/moradores">
          <Button variant="outline" className="mt-4">
            Voltar para Moradores
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <ReadOnlyNotice />

      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/moradores">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{morador.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Edição de dados cadastrais e gestão de vínculos com apartamentos" : "Visualização de dados cadastrais e vínculos com apartamentos"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Personal Data Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Dados Cadastrais</CardTitle>
                  <CardDescription>Informações pessoais e de contato</CardDescription>
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
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
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
                      value={form.telefone}
                      onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo de Perfil *</Label>
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
                      value={form.veiculo}
                      onChange={(e) => setForm({ ...form, veiculo: e.target.value })}
                    />
                  </div>
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

        {/* Apartamentos Vinculados Section */}
        <div className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Apartamentos Vinculados</CardTitle>
                  <CardDescription>Unidades associadas a este morador</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista dos apartamentos vinculados */}
              <div className="space-y-2">
                {morador.apartamentos && morador.apartamentos.length > 0 ? (
                  morador.apartamentos.map((ap) => (
                    <div
                      key={ap.apartamento_id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 text-sm"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <span>Apto {ap.numero}</span>
                          {ap.bloco && <span className="text-xs text-muted-foreground font-normal">({ap.bloco})</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={
                              ap.tipo_vinculo === "proprietario"
                                ? "bg-blue-500/15 text-blue-600 border-blue-500/30 text-[11px]"
                                : "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[11px]"
                            }
                          >
                            {ap.tipo_vinculo === "proprietario" ? "Proprietário" : "Residente"}
                          </Badge>
                          {ap.is_responsavel && (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] py-0 px-1.5 font-medium">
                              Resp. Financeiro
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDesvincularApartamento(ap.apartamento_id, ap.numero)}
                          title="Desvincular este apartamento"
                          disabled={desvincularMut.isPending}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                    Nenhum apartamento vinculado a este perfil.
                  </div>
                )}
              </div>

              {/* Form para vincular novo apartamento */}
              {isAdmin && (
                <form onSubmit={handleVincularApartamento} className="pt-3 border-t space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Vincular Nova Unidade
                  </Label>

                  <div className="space-y-2">
                    <Select
                      value={selectedApartamentoToLink}
                      onValueChange={(v) => setSelectedApartamentoToLink(v)}
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue placeholder="Escolha um apartamento..." />
                      </SelectTrigger>
                      <SelectContent>
                        {aptosData?.items?.map((apto) => (
                          <SelectItem key={apto.id} value={apto.id}>
                            Apto {apto.numero} {apto.bloco ? `(${apto.bloco})` : ""} - {apto.tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Select
                      value={tipoVinculoNovo}
                      onValueChange={(v: "residente" | "proprietario") => setTipoVinculoNovo(v)}
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residente">Vínculo: Residente / Inquilino</SelectItem>
                        <SelectItem value="proprietario">Vínculo: Proprietário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="definirComoRespMorador"
                      checked={definirComoResp}
                      onChange={(e) => setDefinirComoResp(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="definirComoRespMorador" className="text-xs font-normal cursor-pointer">
                      Definir como Responsável Administrativo / Financeiro
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={!selectedApartamentoToLink || vincularMut.isPending}
                    className="w-full text-xs"
                  >
                    <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                    {vincularMut.isPending ? "Vinculando..." : "Adicionar Vínculo"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
