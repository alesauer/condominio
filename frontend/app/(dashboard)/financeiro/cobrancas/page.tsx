"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useCobrancas,
  usePagarCobranca,
  useGerarCobrancasMensais,
  usePreviaCobrancasMensais,
  type CobrancaPreviaResult,
} from "@/services/cobrancas.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useSortableData } from "@/hooks/use-sortable-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CheckCircle, PlusCircle, Filter, Calculator, Droplets, Flame, Receipt, Building2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function CobrancasPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form de geração mensal
  const today = new Date();
  const defaultComp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultVenc = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-10`;

  const [formGerar, setFormGerar] = useState({
    competencia: defaultComp,
    vencimento: defaultVenc,
    valor_fundo_reserva: "0.00",
    incluir_despesas: true,
    incluir_agua: true,
    incluir_gas: true,
    descricao: "",
  });

  const [previa, setPrevia] = useState<CobrancaPreviaResult | null>(null);

  const { data, isLoading } = useCobrancas({
    page,
    page_size: 15,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const enrichedItems = useMemo(() => {
    return (data?.items || []).map((c) => ({
      ...c,
      multa_juros: (c.multa || 0) + (c.juros || 0),
    }));
  }, [data?.items]);

  const { items: sortedItems, sortField, sortDirection, requestSort } = useSortableData(
    enrichedItems,
    "status",
    "asc"
  );

  const pagarMut = usePagarCobranca();
  const gerarMut = useGerarCobrancasMensais();
  const previaMut = usePreviaCobrancasMensais();

  // Carrega prévia quando abre o modal ou altera parâmetros de competência/inclusões
  useEffect(() => {
    if (!dialogOpen) return;

    const timer = setTimeout(() => {
      previaMut
        .mutateAsync({
          competencia: formGerar.competencia,
          vencimento: formGerar.vencimento,
          valor_fundo_reserva: Number(formGerar.valor_fundo_reserva) || 0,
          incluir_despesas: formGerar.incluir_despesas,
          incluir_agua: formGerar.incluir_agua,
          incluir_gas: formGerar.incluir_gas,
        })
        .then((res) => setPrevia(res))
        .catch(() => setPrevia(null));
    }, 200);

    return () => clearTimeout(timer);
  }, [
    dialogOpen,
    formGerar.competencia,
    formGerar.vencimento,
    formGerar.valor_fundo_reserva,
    formGerar.incluir_despesas,
    formGerar.incluir_agua,
    formGerar.incluir_gas,
  ]);

  const handlePagar = async (id: string) => {
    try {
      await pagarMut.mutateAsync(id);
      toast.success("Pagamento registrado com sucesso!");
    } catch {
      toast.error("Erro ao registrar pagamento.");
    }
  };

  const handleGerarMensal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await gerarMut.mutateAsync({
        competencia: formGerar.competencia,
        vencimento: formGerar.vencimento,
        valor_fundo_reserva: Number(formGerar.valor_fundo_reserva) || 0,
        incluir_despesas: formGerar.incluir_despesas,
        incluir_agua: formGerar.incluir_agua,
        incluir_gas: formGerar.incluir_gas,
        descricao: formGerar.descricao || undefined,
      });
      toast.success(`${res.geradas} cobranças geradas com sucesso! Total: ${formatCurrency(res.total_valor)}`);
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Erro ao gerar cobranças.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cobranças</h1>
          <p className="text-muted-foreground">
            Controle e emissão de cobranças consolidadas por apartamento
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Gerar Cobranças do Mês
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" /> Gerar Lote de Cobranças do Mês
              </DialogTitle>
              <DialogDescription>
                Consolidação automática: soma as despesas do mês por fração ideal, rateio de água, consumo individual de gás e valor do fundo de reserva por apartamento.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleGerarMensal} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="competencia">Competência (Mês Referência)</Label>
                  <Input
                    id="competencia"
                    type="date"
                    required
                    value={formGerar.competencia}
                    onChange={(e) => setFormGerar({ ...formGerar, competencia: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vencimento">Data de Vencimento</Label>
                  <Input
                    id="vencimento"
                    type="date"
                    required
                    value={formGerar.vencimento}
                    onChange={(e) => setFormGerar({ ...formGerar, vencimento: e.target.value })}
                  />
                </div>
              </div>

              {/* Switches de Componentes do Cálculo */}
              <div className="space-y-2.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Composição do Cálculo
                </Label>

                {/* Despesas do Mês */}
                <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-rose-500" />
                      <Label className="text-sm font-medium">Somar Despesas do Mês</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Soma todas as despesas da competência e divide pela fração ideal de cada apartamento
                    </p>
                  </div>
                  <Switch
                    checked={formGerar.incluir_despesas}
                    onCheckedChange={(v) => setFormGerar({ ...formGerar, incluir_despesas: v })}
                  />
                </div>

                {/* Rateio de Água */}
                <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <Label className="text-sm font-medium">Incluir Rateio de Água</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Soma o rateio de água apurado na competência (calculado por fração ideal)
                    </p>
                  </div>
                  <Switch
                    checked={formGerar.incluir_agua}
                    onCheckedChange={(v) => setFormGerar({ ...formGerar, incluir_agua: v })}
                  />
                </div>

                {/* Consumo de Gás */}
                <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-amber-500" />
                      <Label className="text-sm font-medium">Incluir Consumo de Gás</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Soma o valor das leituras individuais de gás registradas para o mês
                    </p>
                  </div>
                  <Switch
                    checked={formGerar.incluir_gas}
                    onCheckedChange={(v) => setFormGerar({ ...formGerar, incluir_gas: v })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor_fundo_reserva">Valor do Fundo de Reserva (R$)</Label>
                  <Input
                    id="valor_fundo_reserva"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formGerar.valor_fundo_reserva}
                    onChange={(e) => setFormGerar({ ...formGerar, valor_fundo_reserva: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição Personalizada (Opcional)</Label>
                  <Input
                    id="descricao"
                    placeholder="Ex: Condomínio Mensal"
                    value={formGerar.descricao}
                    onChange={(e) => setFormGerar({ ...formGerar, descricao: e.target.value })}
                  />
                </div>
              </div>

              {/* Card de Prévia Dinâmica */}
              <div className="rounded-lg border bg-card p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calculator className="h-3.5 w-3.5 text-primary" /> Prévia dos Cálculos Apurados
                  </span>
                  {previaMut.isPending && <span className="text-xs text-muted-foreground animate-pulse">Calculando prévia...</span>}
                </div>

                {previa ? (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      <div className="p-2 rounded bg-muted/40 border">
                        <span className="text-muted-foreground block">Despesas Mês</span>
                        <span className="font-semibold text-rose-600">{formatCurrency(previa.total_despesas_mes)}</span>
                      </div>
                      <div className="p-2 rounded bg-muted/40 border">
                        <span className="text-muted-foreground block">Água Total</span>
                        <span className="font-semibold text-blue-600">{formatCurrency(previa.total_agua)}</span>
                      </div>
                      <div className="p-2 rounded bg-muted/40 border">
                        <span className="text-muted-foreground block">Gás Total</span>
                        <span className="font-semibold text-amber-600">{formatCurrency(previa.total_gas)}</span>
                      </div>
                      <div className="p-2 rounded bg-muted/40 border">
                        <span className="text-muted-foreground block">F. Reserva</span>
                        <span className="font-semibold text-emerald-600">{formatCurrency(previa.total_fundo_reserva ?? previa.total_base ?? 0)}</span>
                      </div>
                      <div className="p-2 rounded bg-primary/10 border border-primary/20">
                        <span className="text-primary font-medium block">Total Geral</span>
                        <span className="font-bold text-primary text-sm">{formatCurrency(previa.total_geral)}</span>
                      </div>
                    </div>

                    <div className="max-h-44 overflow-y-auto rounded border text-xs">
                      <table className="w-full">
                        <thead className="bg-muted/50 text-left sticky top-0">
                          <tr className="border-b">
                            <th className="p-1.5 font-medium">Apto</th>
                            <th className="p-1.5 font-medium text-right">Fração</th>
                            {formGerar.incluir_despesas && <th className="p-1.5 font-medium text-right">Despesas</th>}
                            {formGerar.incluir_agua && <th className="p-1.5 font-medium text-right">Água</th>}
                            {formGerar.incluir_gas && <th className="p-1.5 font-medium text-right">Gás</th>}
                            {Number(formGerar.valor_fundo_reserva) > 0 && <th className="p-1.5 font-medium text-right">F. Reserva</th>}
                            <th className="p-1.5 font-medium text-right">Total Apto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {previa.apartamentos.map((a) => (
                            <tr key={a.apartamento_id} className="hover:bg-muted/20">
                              <td className="p-1.5 font-semibold">
                                Apto {a.apartamento_numero}
                                {a.ja_gerado && (
                                  <span className="ml-1.5 text-[10px] text-amber-600 bg-amber-500/10 px-1 py-0.5 rounded">
                                    Já Gerado
                                  </span>
                                )}
                              </td>
                              <td className="p-1.5 text-right text-muted-foreground">
                                {(a.fracao_ideal * 100).toFixed(2).replace(".", ",")}%
                              </td>
                              {formGerar.incluir_despesas && (
                                <td className="p-1.5 text-right">{formatCurrency(a.valor_despesas)}</td>
                              )}
                              {formGerar.incluir_agua && (
                                <td className="p-1.5 text-right">{formatCurrency(a.valor_agua)}</td>
                              )}
                              {formGerar.incluir_gas && (
                                <td className="p-1.5 text-right">{formatCurrency(a.valor_gas)}</td>
                              )}
                              {Number(formGerar.valor_fundo_reserva) > 0 && (
                                <td className="p-1.5 text-right">{formatCurrency(a.valor_fundo_reserva ?? a.valor_base ?? 0)}</td>
                              )}
                              <td className="p-1.5 text-right font-bold text-primary">{formatCurrency(a.valor_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground p-3 text-center">
                    Selecione a competência para carregar os valores e rateios apurados.
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={gerarMut.isPending}>
                  {gerarMut.isPending ? "Gerando Cobranças..." : "Confirmar e Gerar Cobranças"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>


      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <SortableHeader field="apartamento_numero" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                    Apartamento
                  </SortableHeader>
                  <SortableHeader field="descricao" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                    Descrição / Detalhamento
                  </SortableHeader>
                  <SortableHeader field="competencia" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                    Competência
                  </SortableHeader>
                  <SortableHeader field="vencimento" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                    Vencimento
                  </SortableHeader>
                  <SortableHeader field="valor" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                    Valor Cobrado
                  </SortableHeader>
                  <SortableHeader field="multa_juros" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                    Multa/Juros
                  </SortableHeader>
                  <SortableHeader field="valor_total" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                    Total
                  </SortableHeader>
                  <SortableHeader field="status" currentField={sortField} direction={sortDirection} onSort={requestSort} align="center">
                    Status
                  </SortableHeader>
                  <th className="p-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedItems.map((c) => {
                  const multaJuros = (c.multa || 0) + (c.juros || 0);
                  const isPago = c.status === "pago";
                  const isAtrasado = c.status === "atrasado";
                  const aptoDisplay = c.apartamento_numero
                    ? `Apto ${c.apartamento_numero}${c.apartamento_bloco ? ` - ${c.apartamento_bloco}` : ""}`
                    : "-";

                  return (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                        {aptoDisplay}
                      </td>
                      <td className="p-3 font-medium text-muted-foreground">
                        {c.descricao}
                      </td>
                      <td className="p-3 whitespace-nowrap">{formatDate(c.competencia)}</td>
                      <td className="p-3 whitespace-nowrap">{formatDate(c.vencimento)}</td>
                      <td className="p-3 text-right">{formatCurrency(c.valor)}</td>
                      <td className="p-3 text-right">{multaJuros > 0 ? formatCurrency(multaJuros) : "—"}</td>
                      <td className="p-3 text-right font-bold text-primary">{formatCurrency(c.valor_total)}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            isPago
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : isAtrasado
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold"
                              : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {c.status !== "pago" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePagar(c.id)}
                            disabled={pagarMut.isPending}
                          >
                            <CheckCircle className="mr-1.5 h-4 w-4 text-emerald-500" />
                            Pagar
                          </Button>
                        )}
                        {c.status === "pago" && c.data_pagamento && (
                          <span className="text-xs text-muted-foreground">
                            Pago em {formatDate(c.data_pagamento)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {sortedItems.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      Nenhuma cobrança encontrada para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Total de {data.total} cobranças cadastradas
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {data.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
