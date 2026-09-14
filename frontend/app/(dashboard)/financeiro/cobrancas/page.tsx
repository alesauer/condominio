"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useCobrancas,
  usePagarCobranca,
  useDeleteCobranca,
  useGerarCobrancasMensais,
  usePreviaCobrancasMensais,
  useDemonstrativoMensal,
  type CobrancaPreviaResult,
} from "@/services/cobrancas.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  CheckCircle,
  PlusCircle,
  Filter,
  Calculator,
  Droplets,
  Flame,
  FileSpreadsheet,
  List,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Building2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  RefreshCw,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DemonstrativoMensalSheet } from "@/components/financeiro/demonstrativo-mensal-sheet";
import { CalculoApartamentoModal } from "@/components/financeiro/calculo-apartamento-modal";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const statusLabel: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};


interface AcaoEventoFormItem {
  id?: string;
  titulo: string;
  descricao: string;
  data?: string;
}

export default function CobrancasPage() {
  const [viewMode, setViewMode] = useState<"demonstrativo" | "lista">("demonstrativo");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [calculoModalOpen, setCalculoModalOpen] = useState(false);
  const [selectedAptoCalculo, setSelectedAptoCalculo] = useState<{
    numero: string;
    competencia: string;
  } | null>(null);

  const handleOpenCalculoApto = (numero?: string | null, competencia?: string | Date | null) => {
    if (!numero) return;
    const compStr =
      typeof competencia === "string"
        ? competencia
        : competencia instanceof Date
        ? competencia.toISOString().slice(0, 10)
        : competenciaParam;

    setSelectedAptoCalculo({
      numero,
      competencia: compStr,
    });
    setCalculoModalOpen(true);
  };

  // Mês / Ano Selecionado
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

  // Form de geração mensal
  const defaultComp = competenciaParam;
  const defaultVenc = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-10`;

  const [formGerar, setFormGerar] = useState({
    competencia: defaultComp,
    vencimento: defaultVenc,
    valor_fundo_reserva: "0.00",
    incluir_despesas: true,
    incluir_agua: true,
    incluir_gas: true,
    separar_fundo_proprietario: true,
    sobrescrever: false,
    descricao: "",
  });

  const [acoesEventos, setAcoesEventos] = useState<AcaoEventoFormItem[]>([]);

  // Atualiza form ao trocar o mês do topo
  useEffect(() => {
    setFormGerar((prev) => ({
      ...prev,
      competencia: competenciaParam,
      vencimento: `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-10`,
      sobrescrever: false,
    }));
  }, [competenciaParam, selectedYear, selectedMonth]);

  const [previa, setPrevia] = useState<CobrancaPreviaResult | null>(null);

  // Query do Demonstrativo Mensal Consolidado
  const {
    data: demonstrativoData,
    isLoading: isDemonstrativoLoading,
    refetch: refetchDemonstrativo,
  } = useDemonstrativoMensal(competenciaParam);

  // Preenche ações/eventos quando abre o modal de geração
  useEffect(() => {
    if (dialogOpen) {
      if (demonstrativoData?.acoes_eventos && demonstrativoData.acoes_eventos.length > 0) {
        setAcoesEventos(
          demonstrativoData.acoes_eventos.map((a) => ({
            id: a.id,
            titulo: a.titulo,
            descricao: a.descricao,
            data: a.data || competenciaParam,
          }))
        );
      } else {
        setAcoesEventos([]);
      }
    }
  }, [dialogOpen, demonstrativoData, competenciaParam]);

  const handleAddAcao = () => {
    setAcoesEventos((prev) => [
      ...prev,
      {
        titulo: "",
        descricao: "",
        data: formGerar.competencia,
      },
    ]);
  };

  const handleRemoveAcao = (index: number) => {
    setAcoesEventos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateAcao = (index: number, field: keyof AcaoEventoFormItem, value: string) => {
    setAcoesEventos((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Query das cobranças individuais
  const { data, isLoading, refetch: refetchCobrancas } = useCobrancas({
    page,
    page_size: 15,
    competencia: viewMode === "lista" ? competenciaParam : undefined,
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
  const deleteMut = useDeleteCobranca();
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
          separar_fundo_proprietario: formGerar.separar_fundo_proprietario,
        })
        .then((res) => {
          setPrevia(res);
          // Se todos ou alguns já foram gerados, podemos sinalizar
        })
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
    formGerar.separar_fundo_proprietario,
  ]);

  const handlePagar = async (id: string) => {
    try {
      await pagarMut.mutateAsync(id);
      toast.success("Pagamento registrado com sucesso!");
      refetchDemonstrativo();
      refetchCobrancas();
    } catch {
      toast.error("Erro ao registrar pagamento.");
    }
  };

  const handleDeleteCobranca = async (id: string, aptoDisplay: string) => {
    if (!confirm(`Deseja realmente excluir a cobrança do ${aptoDisplay}?`)) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Cobrança excluída com sucesso!");
      refetchDemonstrativo();
      refetchCobrancas();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Erro ao excluir cobrança.");
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
        separar_fundo_proprietario: formGerar.separar_fundo_proprietario,
        sobrescrever: formGerar.sobrescrever,
        descricao: formGerar.descricao || undefined,
        acoes_eventos: acoesEventos
          .filter((a) => a.titulo.trim() && a.descricao.trim())
          .map((a) => ({
            id: a.id,
            titulo: a.titulo.trim(),
            descricao: a.descricao.trim(),
            data: a.data || formGerar.competencia,
          })),
      });
      toast.success(`${res.geradas} cobranças geradas com sucesso! Total: ${formatCurrency(res.total_valor)}`);
      setDialogOpen(false);
      refetchDemonstrativo();
      refetchCobrancas();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Erro ao gerar cobranças.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200/60 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Cobranças e Demonstrativo Mensal
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Fechamento consolidado do mês e emissão de cobranças detalhadas por apartamento
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Competência (Mês / Ano) */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-600 hover:text-slate-900"
              onClick={handlePrevMonth}
              title="Mês Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1.5 px-3">
              <Calendar className="h-3.5 w-3.5 text-primary-600" />
              <span className="font-semibold text-xs sm:text-sm text-slate-800 whitespace-nowrap">
                {MESES[selectedMonth - 1]} de {selectedYear}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-600 hover:text-slate-900"
              onClick={handleNextMonth}
              title="Próximo Mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Modal de Geração de Cobranças */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-xs">
                <PlusCircle className="h-4 w-4" />
                <span>Gerar Lote do Mês</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Calculator className="h-5 w-5 text-primary-600" /> Gerar Lote de Cobranças do Mês
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Consolidação automática: soma as despesas do mês divididas igualmente, rateio de água por fração ideal, consumo individual de gás e valor do fundo de reserva por apartamento.
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
                        <Building2 className="h-4 w-4 text-rose-500" />
                        <span className="text-sm font-medium">Despesas do Mês</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Soma despesas únicas e parceladas e divide igualmente entre os apartamentos
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
                        <span className="text-sm font-medium">Rateio de Água (COPASA)</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Inclui valor apurado no módulo de Rateio de Água desta competência
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
                        <span className="text-sm font-medium">Consumo Individual de Gás</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Inclui consumo medido individualmente por apartamento
                      </p>
                    </div>
                    <Switch
                      checked={formGerar.incluir_gas}
                      onCheckedChange={(v) => setFormGerar({ ...formGerar, incluir_gas: v })}
                    />
                  </div>

                  {/* Separação de Fundo de Reserva para Proprietários em Imóveis Alugados */}
                  <div className="flex items-center justify-between rounded-lg border p-3 bg-emerald-500/5 border-emerald-500/20">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-950 dark:text-emerald-200">
                          Separar Fundo de Reserva para Proprietários (Alugados)
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Em imóveis alugados, gera 1 cobrança para o Inquilino (Ordinárias + Gás) e 1 cobrança separada para o Proprietário (Fundo de Reserva)
                      </p>
                    </div>
                    <Switch
                      checked={formGerar.separar_fundo_proprietario}
                      onCheckedChange={(v) => setFormGerar({ ...formGerar, separar_fundo_proprietario: v })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valor_fundo_reserva">Valor do Fundo de Reserva (R$ por Apto)</Label>
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
                      placeholder="Ex: Taxa Condominial Ref. Mês"
                      value={formGerar.descricao}
                      onChange={(e) => setFormGerar({ ...formGerar, descricao: e.target.value })}
                    />
                  </div>
                </div>

                {/* Ações / Eventos Realizados no Mês */}
                <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-semibold">Ações / Eventos Realizados no Mês</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Comunicações, manutenções ou eventos extraordinários para constar no demonstrativo mensal
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddAcao}
                      className="h-8 gap-1 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar Ação
                    </Button>
                  </div>

                  {acoesEventos.length === 0 ? (
                    <div className="text-center py-3 border border-dashed rounded bg-background/50 text-xs text-muted-foreground">
                      Nenhuma ação/evento adicionado. Clique em &quot;Adicionar Ação&quot; para incluir manutenções ou avisos no demonstrativo.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                      {acoesEventos.map((acao, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 rounded border bg-background/80 shadow-sm items-start"
                        >
                          <div className="sm:col-span-3 space-y-1">
                            <Label className="text-[11px] font-medium text-muted-foreground">Data (Opcional)</Label>
                            <Input
                              type="date"
                              className="h-8 text-xs"
                              value={acao.data || ""}
                              onChange={(e) => handleUpdateAcao(index, "data", e.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-4 space-y-1">
                            <Label className="text-[11px] font-medium text-muted-foreground">Ação / Evento</Label>
                            <Input
                              placeholder="Ex: Manutenção Portão"
                              className="h-8 text-xs"
                              value={acao.titulo}
                              onChange={(e) => handleUpdateAcao(index, "titulo", e.target.value)}
                              required
                            />
                          </div>
                          <div className="sm:col-span-4 space-y-1">
                            <Label className="text-[11px] font-medium text-muted-foreground">Descrição</Label>
                            <Input
                              placeholder="Ex: Troca de molas e lubrificação"
                              className="h-8 text-xs"
                              value={acao.descricao}
                              onChange={(e) => handleUpdateAcao(index, "descricao", e.target.value)}
                              required
                            />
                          </div>
                          <div className="sm:col-span-1 flex items-end justify-center pt-2 sm:pt-5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                              onClick={() => handleRemoveAcao(index)}
                              title="Remover ação"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prévia dos Valores Calculados */}
                <div className="rounded-lg border bg-card p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Prévia dos Valores
                    </span>
                    {previaMut.isPending && (
                      <span className="text-xs text-muted-foreground animate-pulse">Calculando prévia...</span>
                    )}
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

                      <div className="max-h-52 overflow-y-auto rounded border text-xs">
                        <table className="w-full">
                          <thead className="bg-muted/60 sticky top-0 border-b">
                            <tr>
                              <th className="p-1.5 font-medium text-left">Apto / Ocupação</th>
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
                              <tr key={a.apartamento_id} className={a.ja_gerado ? "bg-amber-500/5" : ""}>
                                <td className="p-1.5 font-medium">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>Apto {a.apartamento_numero}</span>
                                    {a.is_alugado && (
                                      <span className="text-[10px] text-blue-700 bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.2 rounded font-semibold">
                                        Alugado
                                      </span>
                                    )}
                                    {a.ja_gerado && (
                                      <span className="text-[10px] text-amber-600 bg-amber-500/10 px-1 py-0.2 rounded">
                                        Já Gerado
                                      </span>
                                    )}
                                  </div>
                                  {a.is_alugado && formGerar.separar_fundo_proprietario && Number(formGerar.valor_fundo_reserva) > 0 && (
                                    <div className="text-[10px] text-muted-foreground pt-0.5">
                                      <span className="text-blue-600 dark:text-blue-400 font-medium">Inq: {formatCurrency(a.cota_inquilino || 0)}</span>
                                      <span className="mx-1">|</span>
                                      <span className="text-purple-600 dark:text-purple-400 font-medium">Prop: {formatCurrency(a.cota_proprietario || 0)}</span>
                                    </div>
                                  )}
                                </td>
                                <td className="p-1.5 text-right text-muted-foreground">
                                  {(a.fracao_ideal * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%
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
                    <div className="flex items-center justify-center p-4 text-xs text-muted-foreground">
                      <AlertCircle className="mr-1.5 h-4 w-4" />
                      Selecione a competência para carregar os valores apurados.
                    </div>
                  )}
                </div>

                {/* Opção de Regerar / Sobrescrever caso já existam cobranças geradas */}
                {((previa?.total_ja_gerados ?? 0) > 0 || previa?.apartamentos?.some((a) => a.ja_gerado)) && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <RotateCcw className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                          Atenção: Já existem cobranças geradas para esta competência (
                          {previa?.total_ja_gerados ?? previa?.apartamentos?.filter((a) => a.ja_gerado).length} apartamento(s)).
                        </p>
                        <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                          Cobranças já <strong>PAGAS</strong> serão preservadas. As cobranças pendentes serão recalculadas e substituídas pelos novos valores caso você marque a opção abaixo.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-amber-500/20">
                      <Label htmlFor="sobrescrever" className="text-xs font-medium cursor-pointer text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
                        Regerar cobranças existentes (substituir pendentes)
                      </Label>
                      <Switch
                        id="sobrescrever"
                        checked={formGerar.sobrescrever}
                        onCheckedChange={(v) => setFormGerar({ ...formGerar, sobrescrever: v })}
                      />
                    </div>
                  </div>
                )}

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={gerarMut.isPending}
                    variant={formGerar.sobrescrever ? "default" : "default"}
                    className={formGerar.sobrescrever ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
                  >
                    {gerarMut.isPending
                      ? "Processando..."
                      : formGerar.sobrescrever
                      ? "Confirmar e Regerar Cobranças"
                      : "Confirmar e Gerar Cobranças"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alternância de Abas: Demonstrativo Mensal vs Lista */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3 print:hidden">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setViewMode("demonstrativo")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === "demonstrativo"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 text-primary-600" />
            <span>Demonstrativo Mensal (Planilha Fechamento)</span>
          </button>
          <button
            onClick={() => setViewMode("lista")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === "lista"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <List className="h-4 w-4 text-primary-600" />
            <span>Lista Individual de Cobranças</span>
          </button>
        </div>

        {viewMode === "lista" && (
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[170px] h-9 text-xs bg-white">
                <Filter className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
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
        )}
      </div>

      {/* ── VISÃO 1: DEMONSTRATIVO MENSAL CONSOLIDADO (PLANILHA) ─────── */}
      {viewMode === "demonstrativo" && (
        <DemonstrativoMensalSheet
          data={demonstrativoData}
          isLoading={isDemonstrativoLoading}
          onRefresh={refetchDemonstrativo}
        />
      )}

      {/* ── VISÃO 2: LISTA INDIVIDUAL DE COBRANÇAS ───────────────────── */}
      {viewMode === "lista" && (
        <>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
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
                      <th className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedItems.map((c) => {
                      const multaJuros = (c.multa || 0) + (c.juros || 0);
                      const isPago = c.status === "pago";
                      const isAtrasado = c.status === "atrasado";
                      const aptoDisplay = c.apartamento_numero
                        ? `Apto ${c.apartamento_numero}${c.apartamento_bloco ? ` - ${c.apartamento_bloco}` : ""}`
                        : "-";

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                            {c.apartamento_numero ? (
                              <button
                                type="button"
                                onClick={() => handleOpenCalculoApto(c.apartamento_numero, c.competencia)}
                                className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-800 font-bold hover:underline transition-colors group cursor-pointer text-left"
                                title={`Clique para ver a memória de cálculo do ${aptoDisplay}`}
                              >
                                <Building2 className="h-3.5 w-3.5 text-primary-600/80 group-hover:scale-110 transition-transform" />
                                <span>{aptoDisplay}</span>
                              </button>
                            ) : (
                              aptoDisplay
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-slate-600">
                            {c.descricao}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">{formatDate(c.competencia)}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">{formatDate(c.vencimento)}</td>
                          <td className="px-4 py-3.5 text-right text-slate-700 font-medium">{formatCurrency(c.valor)}</td>
                          <td className="px-4 py-3.5 text-right text-slate-500">{multaJuros > 0 ? formatCurrency(multaJuros) : "—"}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-slate-900">{formatCurrency(c.valor_total)}</td>
                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`status-pill ${
                                isPago
                                  ? "status-pill-pago"
                                  : isAtrasado
                                  ? "status-pill-atrasado"
                                  : "status-pill-pendente"
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              <span>{statusLabel[c.status] || c.status}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {c.apartamento_numero && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenCalculoApto(c.apartamento_numero, c.competencia)}
                                  className="h-8 px-2 text-xs gap-1 text-primary-600 hover:bg-primary-50"
                                  title="Visualizar cálculo detalhado do condomínio"
                                >
                                  <Calculator className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">Cálculo</span>
                                </Button>
                              )}
                              {c.status !== "pago" && (
                                <>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handlePagar(c.id)}
                                    disabled={pagarMut.isPending}
                                    className="h-8 text-xs text-emerald-700 hover:text-emerald-800"
                                  >
                                    <CheckCircle className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                                    Pagar
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteCobranca(c.id, aptoDisplay)}
                                    disabled={deleteMut.isPending}
                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    title="Excluir cobrança pendente"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              {c.status === "pago" && c.data_pagamento && (
                                <span className="text-xs text-slate-500 whitespace-nowrap">
                                  Pago em {formatDate(c.data_pagamento)}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {sortedItems.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-sm text-slate-400">
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
        </>
      )}

      {/* Modal de Memória de Cálculo Individual do Apartamento */}
      <CalculoApartamentoModal
        open={calculoModalOpen}
        onOpenChange={setCalculoModalOpen}
        apartamentoNumero={selectedAptoCalculo?.numero || null}
        competencia={selectedAptoCalculo?.competencia || competenciaParam}
        demonstrativoData={
          selectedAptoCalculo?.competencia === competenciaParam || !selectedAptoCalculo?.competencia
            ? demonstrativoData
            : undefined
        }
      />
    </div>
  );
}
