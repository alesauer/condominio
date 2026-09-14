"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  usePlanilhaGas,
  useSalvarLoteGas,
  type LeituraGasPlanilhaItem,
} from "@/services/gas.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  Flame,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Save,
  RotateCcw,
  Building2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

interface RowState {
  apartamento_id: string;
  apartamento_numero: string;
  apartamento_bloco?: string | null;
  leitura_anterior: string;
  leitura_atual: string;
  valor_unitario: string;
  observacao: string;
  leitura_id?: string | null;
  isDirty?: boolean;
}

export default function GasPage() {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);

  const competenciaParam = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Queries e Mutations
  const { data: planilhaData, isLoading, refetch } = usePlanilhaGas(competenciaParam);
  const salvarMut = useSalvarLoteGas();

  const [valorUnitarioPadrao, setValorUnitarioPadrao] = useState("19.95");
  const [rows, setRows] = useState<RowState[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sincroniza estado local quando os dados da planilha chegam da API
  useEffect(() => {
    if (planilhaData) {
      const defaultUnit = planilhaData.valor_unitario_padrao || 19.95;
      setValorUnitarioPadrao(String(defaultUnit));

      const newRows: RowState[] = planilhaData.itens.map((item) => ({
        apartamento_id: item.apartamento_id,
        apartamento_numero: item.apartamento_numero,
        apartamento_bloco: item.apartamento_bloco,
        leitura_anterior: item.leitura_anterior != null ? String(item.leitura_anterior) : "0",
        leitura_atual: item.leitura_atual != null ? String(item.leitura_atual) : "",
        valor_unitario: item.valor_unitario != null ? String(item.valor_unitario) : String(defaultUnit),
        observacao: item.observacao || "",
        leitura_id: item.leitura_id,
        isDirty: false,
      }));

      setRows(newRows);
      setHasUnsavedChanges(false);
    }
  }, [planilhaData]);

  // Atualiza campo específico de uma linha
  const handleCellChange = (
    index: number,
    field: "leitura_anterior" | "leitura_atual" | "valor_unitario" | "observacao",
    value: string
  ) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
        isDirty: true,
      };
      return next;
    });
    setHasUnsavedChanges(true);
  };

  // Atualiza o valor unitário global e propaga para linhas que usam o valor padrão
  const handleValorUnitarioPadraoChange = (newVal: string) => {
    setValorUnitarioPadrao(newVal);
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        valor_unitario: newVal,
        isDirty: true,
      }))
    );
    setHasUnsavedChanges(true);
  };

  // Ação rápida: Copiar Leitura Anterior como Leitura Atual para quem está vazio
  const handlePreencherSemConsumo = () => {
    setRows((prev) =>
      prev.map((r) => {
        if (!r.leitura_atual && r.leitura_anterior) {
          return {
            ...r,
            leitura_atual: r.leitura_anterior,
            isDirty: true,
          };
        }
        return r;
      })
    );
    setHasUnsavedChanges(true);
    toast.info("Leituras anteriores replicadas como leitura atual para apartamentos vazios.");
  };

  // Cálculos dinâmicos por linha e totais
  const calculatedRows = useMemo(() => {
    let totalConsumo = 0;
    let totalValor = 0;
    let preenchidosCount = 0;

    const items = rows.map((r) => {
      const ant = Number(r.leitura_anterior) || 0;
      const hasAtual = r.leitura_atual.trim() !== "";
      const atual = hasAtual ? Number(r.leitura_atual) || 0 : null;
      const unit = Number(r.valor_unitario) || Number(valorUnitarioPadrao) || 19.95;

      let consumo = 0;
      let valorCobrado = 0;

      if (atual !== null) {
        consumo = Math.max(0, atual - ant);
        valorCobrado = consumo * unit;
        preenchidosCount++;
      }

      totalConsumo += consumo;
      totalValor += valorCobrado;

      return {
        ...r,
        consumoCalculado: consumo,
        valorCobradoCalculado: valorCobrado,
        hasAtual,
      };
    });

    return {
      items,
      totalConsumo,
      totalValor,
      preenchidosCount,
      totalAptos: rows.length,
    };
  }, [rows, valorUnitarioPadrao]);

  // Salvar Lote
  const handleSalvar = async () => {
    try {
      const payload = {
        competencia: competenciaParam,
        valor_unitario_padrao: Number(valorUnitarioPadrao) || 19.95,
        leituras: rows
          .filter((r) => r.leitura_atual.trim() !== "")
          .map((r) => ({
            apartamento_id: r.apartamento_id,
            leitura_anterior: r.leitura_anterior.trim() !== "" ? Number(r.leitura_anterior) : 0,
            leitura_atual: Number(r.leitura_atual),
            valor_unitario: Number(r.valor_unitario) || Number(valorUnitarioPadrao) || 19.95,
            observacao: r.observacao.trim() || undefined,
          })),
      };

      await salvarMut.mutateAsync(payload);
      toast.success("Leituras de gás salvas com sucesso!");
      setHasUnsavedChanges(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Erro ao salvar leituras de gás.");
    }
  };

  // Atalho de Teclado Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSalvar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rows, valorUnitarioPadrao, competenciaParam]);

  // Ref para navegação com teclado
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleKeyDownInput = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    field: "anterior" | "atual"
  ) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = index + 1;
      const target = inputRefs.current[`${field}-${nextIndex}`];
      if (target) {
        target.focus();
        target.select();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = index - 1;
      const target = inputRefs.current[`${field}-${prevIndex}`];
      if (target) {
        target.focus();
        target.select();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Leituras de Gás</h1>
              <p className="text-sm text-muted-foreground">
                Planilha interativa de medição por apartamento com cálculo automático de consumo e valor
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Competência (Mês / Ano) */}
          <div className="flex items-center bg-card border rounded-md p-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handlePrevMonth}
              title="Mês Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1.5 px-3">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-xs sm:text-sm whitespace-nowrap">
                {MESES[selectedMonth - 1]} de {selectedYear}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleNextMonth}
              title="Próximo Mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Botão Salvar Leituras */}
          <Button
            onClick={handleSalvar}
            disabled={salvarMut.isPending}
            className={`gap-1.5 ${
              hasUnsavedChanges
                ? "bg-amber-600 hover:bg-amber-700 text-white shadow-md animate-pulse"
                : ""
            }`}
          >
            <Save className="h-4 w-4" />
            {salvarMut.isPending ? "Salvando..." : "Salvar Leituras"}
            {hasUnsavedChanges && (
              <span className="ml-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">
                Ctrl+S
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Barra de Controles e Resumo de Totais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Controle do Preço do m³ */}
        <div className="p-3.5 rounded-xl border bg-card/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Preço do m³ (R$)
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Taxa Geral
            </Badge>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm font-semibold text-muted-foreground">R$</span>
            <Input
              type="number"
              step="0.0001"
              className="h-9 text-base font-bold bg-background text-foreground"
              value={valorUnitarioPadrao}
              onChange={(e) => handleValorUnitarioPadraoChange(e.target.value)}
              placeholder="19.95"
            />
          </div>
        </div>

        {/* Consumo Total do Mês */}
        <div className="p-3.5 rounded-xl border bg-amber-500/5 border-amber-500/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-500" /> Consumo Total do Mês
            </span>
            <span className="text-[11px] text-amber-700/80 dark:text-amber-300/80">Soma Geral</span>
          </div>
          <div className="pt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {calculatedRows.totalConsumo.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-amber-700/80 dark:text-amber-300/80">m³</span>
          </div>
        </div>

        {/* Valor Total a Faturar */}
        <div className="p-3.5 rounded-xl border bg-primary/5 border-primary/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" /> Total a Cobrar
            </span>
            <span className="text-[11px] text-primary/70">Rateado</span>
          </div>
          <div className="pt-1">
            <span className="text-2xl font-black text-primary">
              {formatCurrency(calculatedRows.totalValor)}
            </span>
          </div>
        </div>

        {/* Status de Preenchimento */}
        <div className="p-3.5 rounded-xl border bg-card/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-blue-500" /> Apartamentos
            </span>
            {hasUnsavedChanges ? (
              <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/30">
                Não salvo
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                Sincronizado
              </Badge>
            )}
          </div>
          <div className="pt-1 flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">
              {calculatedRows.preenchidosCount} de {calculatedRows.totalAptos} lançados
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePreencherSemConsumo}
              className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
              title="Preenche Leitura Atual igual à Leitura Anterior para os apartamentos vazios"
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Replicar sem consumo
            </Button>
          </div>
        </div>
      </div>

      {/* Tabela Interativa de Planilha */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/60 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4 text-left">Apartamento</th>
                  <th className="py-3 px-3 text-center">Competência</th>
                  <th className="py-3 px-3 text-right w-36">Leitura Ant. (m³)</th>
                  <th className="py-3 px-3 text-right w-40">Leitura Atual (m³)</th>
                  <th className="py-3 px-3 text-right w-32">Consumo</th>
                  <th className="py-3 px-3 text-right w-32">Valor (R$/m³)</th>
                  <th className="py-3 px-4 text-right w-36">Total Cobrado</th>
                  <th className="py-3 px-3 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {calculatedRows.items.map((row, idx) => {
                  const hasConsumo = row.consumoCalculado > 0;
                  const isFilled = row.hasAtual;

                  return (
                    <tr
                      key={row.apartamento_id}
                      className={`transition-colors group hover:bg-muted/30 ${
                        hasConsumo ? "bg-amber-500/[0.03]" : ""
                      }`}
                    >
                      {/* Apartamento */}
                      <td className="py-2.5 px-4 font-semibold text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-md bg-muted/80 flex items-center justify-center text-xs font-bold text-primary group-hover:bg-primary/10 transition-colors">
                            {row.apartamento_numero}
                          </div>
                          <div>
                            <span className="font-bold">Apto {row.apartamento_numero}</span>
                            {row.apartamento_bloco && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({row.apartamento_bloco})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Competência */}
                      <td className="py-2.5 px-3 text-center text-xs text-muted-foreground whitespace-nowrap">
                        {String(selectedMonth).padStart(2, "0")}/{selectedYear}
                      </td>

                      {/* Leitura Anterior */}
                      <td className="py-2.5 px-3 text-right">
                        <Input
                          ref={(el) => { inputRefs.current[`anterior-${idx}`] = el; }}
                          type="number"
                          step="0.01"
                          className="h-8 text-right text-xs font-mono font-medium bg-background/80 border-muted-foreground/30 focus-visible:ring-1"
                          value={row.leitura_anterior}
                          onChange={(e) => handleCellChange(idx, "leitura_anterior", e.target.value)}
                          onKeyDown={(e) => handleKeyDownInput(e, idx, "anterior")}
                          placeholder="0"
                        />
                      </td>

                      {/* Leitura Atual */}
                      <td className="py-2.5 px-3 text-right">
                        <Input
                          ref={(el) => { inputRefs.current[`atual-${idx}`] = el; }}
                          type="number"
                          step="0.01"
                          className={`h-8 text-right text-xs font-mono font-bold bg-background focus-visible:ring-2 focus-visible:ring-primary ${
                            isFilled
                              ? "border-primary/50 text-foreground"
                              : "border-dashed border-muted-foreground/40 text-muted-foreground"
                          }`}
                          value={row.leitura_atual}
                          onChange={(e) => handleCellChange(idx, "leitura_atual", e.target.value)}
                          onKeyDown={(e) => handleKeyDownInput(e, idx, "atual")}
                          placeholder="Digite a leitura..."
                          autoFocus={idx === 0}
                        />
                      </td>

                      {/* Consumo Calculado */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {isFilled ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs ${
                              hasConsumo
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                : "text-muted-foreground"
                            }`}
                          >
                            {row.consumoCalculado.toLocaleString("pt-BR", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}{" "}
                            m³
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </td>

                      {/* Valor Unitário */}
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatCurrency(Number(row.valor_unitario) || Number(valorUnitarioPadrao) || 19.95)}
                        </span>
                      </td>

                      {/* Total Cobrado */}
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        {isFilled ? (
                          <span
                            className={`font-bold text-sm ${
                              hasConsumo
                                ? "text-primary dark:text-primary-foreground font-extrabold"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatCurrency(row.valorCobradoCalculado)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">R$ 0,00</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {row.isDirty ? (
                          <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/30">
                            Editado
                          </Badge>
                        ) : isFilled ? (
                          <span className="inline-flex items-center text-[11px] text-emerald-600 dark:text-emerald-400 gap-1 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Salvo
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60">Pendente</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {calculatedRows.items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground text-sm">
                      Nenhum apartamento encontrado para exibir na planilha.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Rodapé da Planilha com Totais Consolidados */}
              {calculatedRows.items.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40 font-semibold text-xs">
                    <td className="py-3 px-4 font-bold text-foreground" colSpan={4}>
                      <div className="flex items-center justify-between">
                        <span>TOTAL GERAL ({calculatedRows.totalAptos} Apartamentos)</span>
                        <span className="text-muted-foreground font-normal">Soma das medições apuradas:</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                        {calculatedRows.totalConsumo.toLocaleString("pt-BR", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}{" "}
                        m³
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-muted-foreground">—</td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-extrabold text-primary text-base">
                        {formatCurrency(calculatedRows.totalValor)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Button
                        size="sm"
                        onClick={handleSalvar}
                        disabled={salvarMut.isPending}
                        className="h-7 text-xs px-2.5 gap-1"
                      >
                        <Save className="h-3 w-3" /> Salvar
                      </Button>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Dica de Utilização */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-lg border bg-muted/20">
        <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">Dica de Produtividade: </span>
          Digite a Leitura Atual e pressione <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">Enter</kbd> ou <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">↓ Seta para Baixo</kbd> para pular rapidamente para o próximo apartamento. Pressione <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">Ctrl + S</kbd> a qualquer momento para salvar todas as alterações.
        </div>
      </div>
    </div>
  );
}
