"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateDespesa } from "@/services/despesas.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Repeat, Split, Info } from "lucide-react";
import { AdminGate, RestrictedPageNotice } from "@/components/auth/admin-gate";

export default function NovaDespesaPage() {
  const router = useRouter();
  const createMut = useCreateDespesa();
  const [form, setForm] = useState({
    descricao: "",
    tipo: "ordinaria",
    valor: "",
    competencia: "",
    status: "pendente",
    categoria: "",
    observacao: "",
    recorrente: false,
    meses_recorrencia: "12",
    parcelamento: false,
    total_parcelas: "2",
  });

  const calculationSummary = useMemo(() => {
    if (!form.competencia || !form.valor) return null;
    const val = Number(form.valor) || 0;

    if (form.recorrente) {
      const meses = parseInt(form.meses_recorrencia, 10) || 1;
      if (meses <= 1) return null;
      return `Serão geradas ${meses} despesas mensais fixas de ${formatCurrency(val)} cada (Total acumulado: ${formatCurrency(val * meses)}).`;
    }

    if (form.parcelamento && form.tipo === "extraordinaria") {
      const parc = parseInt(form.total_parcelas, 10) || 1;
      if (parc <= 1) return null;
      const valorParc = val / parc;
      return `O valor total de ${formatCurrency(val)} será dividido em ${parc} parcelas de ${formatCurrency(valorParc)} ao mês.`;
    }

    return null;
  }, [form.recorrente, form.parcelamento, form.tipo, form.competencia, form.valor, form.meses_recorrencia, form.total_parcelas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isRecorrente = form.recorrente && !form.parcelamento;
      const isParcelado = form.parcelamento && form.tipo === "extraordinaria" && !form.recorrente;
      const meses = isRecorrente ? parseInt(form.meses_recorrencia, 10) : null;
      const parcelas = isParcelado ? Number(form.total_parcelas) : null;

      await createMut.mutateAsync({
        descricao: form.descricao,
        tipo: form.tipo as any,
        valor: Number(form.valor),
        competencia: form.competencia,
        status: form.status as any,
        categoria: form.categoria || null,
        observacao: form.observacao || null,
        vencimento: null,
        data_pagamento: null,
        parcelamento: isParcelado,
        total_parcelas: parcelas,
        recorrente: isRecorrente,
        meses_recorrencia: meses,
      });

      if (isRecorrente && meses && meses > 1) {
        toast.success(`${meses} despesas recorrentes cadastradas com sucesso!`);
      } else if (isParcelado && parcelas && parcelas > 1) {
        toast.success(`Despesa criada com ${parcelas} parcelas!`);
      } else {
        toast.success("Despesa criada com sucesso!");
      }
      router.push("/financeiro/despesas");
    } catch {
      toast.error("Erro ao criar despesa");
    }
  };

  return (
    <AdminGate fallback={<RestrictedPageNotice backHref="/financeiro/despesas" backLabel="Voltar para Despesas" />}>
      <div className="max-w-xl space-y-4">
        <div className="flex items-center gap-2">
        <Link href="/financeiro/despesas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nova Despesa</h1>
          <p className="text-xs text-muted-foreground">Cadastre despesas fixas, recorrentes ou parceladas do condomínio</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                required
                placeholder="Ex: Conservadora Ideal, Lilico Gás, Cemig, Manutenção..."
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => {
                    setForm({
                      ...form,
                      tipo: v,
                      parcelamento: v === "ordinaria" ? false : form.parcelamento,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ordinaria">Ordinária (Mensal / Rotina)</SelectItem>
                    <SelectItem value="extraordinaria">Extraordinária (Obras / Melhorias)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{form.parcelamento ? "Valor Total da Despesa (R$)" : "Valor Unitário / Mensal (R$)"}</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Competência Inicial</Label>
                <Input
                  required
                  type="date"
                  value={form.competencia}
                  onChange={(e) => setForm({ ...form, competencia: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status Inicial</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Recorrência (Mesmo valor repetido todo mês) */}
            <div className="rounded-lg border p-4 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-primary" />
                  <div>
                    <Label className="font-semibold cursor-pointer">Despesa Recorrente</Label>
                    <p className="text-xs text-muted-foreground">Repetir automaticamente este mesmo valor por vários meses (ex: contratos fixos)</p>
                  </div>
                </div>
                <Switch
                  checked={form.recorrente}
                  onCheckedChange={(v) => {
                    setForm({ ...form, recorrente: v, parcelamento: v ? false : form.parcelamento });
                  }}
                />
              </div>

              {form.recorrente && (
                <div className="pt-2 border-t space-y-3 animate-in fade-in-50 duration-200">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label className="text-xs font-medium">Quantidade de Meses a Gerar:</Label>
                      <Select
                        value={form.meses_recorrencia}
                        onValueChange={(v) => setForm({ ...form, meses_recorrencia: v })}
                      >
                        <SelectTrigger className="h-9 mt-1">
                          <SelectValue placeholder="Selecione o período" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 meses</SelectItem>
                          <SelectItem value="3">3 meses</SelectItem>
                          <SelectItem value="6">6 meses (Semestral)</SelectItem>
                          <SelectItem value="12">12 meses (1 ano)</SelectItem>
                          <SelectItem value="24">24 meses (2 anos)</SelectItem>
                          <SelectItem value="36">36 meses (3 anos)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Label className="text-xs font-medium">Ou manual:</Label>
                      <Input
                        type="number"
                        min="2"
                        max="60"
                        className="h-9 mt-1"
                        value={form.meses_recorrencia}
                        onChange={(e) => setForm({ ...form, meses_recorrencia: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Parcelamento (Apenas para despesas extraordinárias) */}
            {form.tipo === "extraordinaria" && !form.recorrente && (
              <div className="rounded-lg border p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Split className="h-4 w-4 text-primary" />
                    <div>
                      <Label className="font-semibold cursor-pointer">Parcelamento de Compra / Obra</Label>
                      <p className="text-xs text-muted-foreground">Dividir o valor total em parcelas mensais</p>
                    </div>
                  </div>
                  <Switch
                    checked={form.parcelamento}
                    onCheckedChange={(v) => {
                      setForm({ ...form, parcelamento: v, recorrente: v ? false : form.recorrente });
                    }}
                  />
                </div>

                {form.parcelamento && (
                  <div className="pt-2 border-t flex items-center gap-4 animate-in fade-in-50 duration-200">
                    <div className="flex-1">
                      <Label className="text-xs font-medium">Número de Parcelas:</Label>
                      <Input
                        type="number"
                        min="2"
                        max="36"
                        className="h-9 mt-1"
                        value={form.total_parcelas}
                        onChange={(e) => setForm({ ...form, total_parcelas: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Resumo do Cálculo */}
            {calculationSummary && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-primary/10 text-primary text-xs">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{calculationSummary}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Categoria (Opcional)</Label>
              <Input
                placeholder="Ex: Água, Energia, Limpeza, Manutenção, Seguro..."
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Observação (Opcional)</Label>
              <Input
                placeholder="Detalhes adicionais do contrato ou serviço..."
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Link href="/financeiro/despesas">
                <Button variant="outline" type="button">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={createMut.isPending}>
                {form.recorrente
                  ? "Salvar Despesas Recorrentes"
                  : form.parcelamento
                  ? "Salvar Despesa Parcelada"
                  : "Salvar Despesa"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
    </AdminGate>
  );
}
