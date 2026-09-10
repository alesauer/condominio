"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useReceitas, useUpdateReceita, useDeleteReceita } from "@/services/receitas.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useSortableData } from "@/hooks/use-sortable-data";
import { ConfirmarPagamentoModal } from "@/components/financeiro/confirmar-pagamento-modal";
import { DuplicarMesModal } from "@/components/financeiro/duplicar-mes-modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Calendar, DollarSign, CheckCircle2, Clock, Paperclip, Download, Copy } from "lucide-react";
import { toast } from "sonner";
import type { Receita } from "@/types/financeiro";

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "pago":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25";
    case "pendente":
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25";
    case "atrasado":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold hover:bg-amber-500/25";
    case "cancelado":
      return "bg-muted text-muted-foreground border-border hover:bg-muted/80";
    default:
      return "bg-muted text-foreground";
  }
};


const tipoLabel: Record<string, string> = {
  condominio: "Condomínio",
  fundo_reserva: "Fundo Reserva",
  taxa_extra: "Taxa Extra",
};

const MESES = [
  { value: "all", label: "Todos os Meses" },
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const ANOS = ["2024", "2025", "2026", "2027"];

export default function ReceitasPage() {
  const currentDate = new Date();
  const [selectedMes, setSelectedMes] = useState<string>(String(currentDate.getMonth() + 1));
  const [selectedAno, setSelectedAno] = useState<string>(String(currentDate.getFullYear()));
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedTipo, setSelectedTipo] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Edit Modal State
  const [editingReceita, setEditingReceita] = useState<Receita | null>(null);
  const [editForm, setEditForm] = useState({
    descricao: "",
    tipo: "condominio",
    valor: "",
    competencia: "",
    vencimento: "",
    data_recebimento: "",
    status: "pendente",
    categoria: "",
    observacao: "",
  });

  // Modal de Confirmação de Pagamento com Comprovante
  const [pagamentoModalItem, setPagamentoModalItem] = useState<Receita | null>(null);
  const [pagamentoModalOpen, setPagamentoModalOpen] = useState(false);

  // Modal de Duplicação de Mês
  const [duplicarModalOpen, setDuplicarModalOpen] = useState(false);

  const queryParams = useMemo(() => {
    const params: Record<string, any> = { page, page_size: 50 };
    if (selectedMes !== "all") params.mes = parseInt(selectedMes, 10);
    if (selectedAno !== "all") params.ano = parseInt(selectedAno, 10);
    if (selectedStatus !== "all") params.status = selectedStatus;
    if (selectedTipo !== "all") params.tipo = selectedTipo;
    return params;
  }, [page, selectedMes, selectedAno, selectedStatus, selectedTipo]);

  const { data, isLoading, refetch } = useReceitas(queryParams);
  const updateMut = useUpdateReceita();
  const deleteMut = useDeleteReceita();

  const { items: sortedReceitas, sortField, sortDirection, requestSort } = useSortableData(
    data?.items || [],
    "status",
    "asc"
  );

  const handlePrevMonth = () => {
    if (selectedMes === "all") {
      setSelectedMes("1");
      return;
    }
    const m = parseInt(selectedMes, 10);
    const y = parseInt(selectedAno, 10);
    if (m === 1) {
      setSelectedMes("12");
      setSelectedAno(String(y - 1));
    } else {
      setSelectedMes(String(m - 1));
    }
    setPage(1);
  };

  const handleNextMonth = () => {
    if (selectedMes === "all") {
      setSelectedMes("12");
      return;
    }
    const m = parseInt(selectedMes, 10);
    const y = parseInt(selectedAno, 10);
    if (m === 12) {
      setSelectedMes("1");
      setSelectedAno(String(y + 1));
    } else {
      setSelectedMes(String(m + 1));
    }
    setPage(1);
  };

  const currentMonthLabel = useMemo(() => {
    if (selectedMes === "all") return `Ano de ${selectedAno}`;
    const mObj = MESES.find((m) => m.value === selectedMes);
    return `${mObj?.label || ""} de ${selectedAno}`;
  }, [selectedMes, selectedAno]);

  // KPIs
  const kpis = useMemo(() => {
    const items = data?.items || [];
    const total = items.reduce((acc, r) => acc + Number(r.valor || 0), 0);
    const pago = items.filter((r) => r.status === "pago").reduce((acc, r) => acc + Number(r.valor || 0), 0);
    const pendente = items.filter((r) => r.status === "pendente" || r.status === "atrasado").reduce((acc, r) => acc + Number(r.valor || 0), 0);
    return { total, pago, pendente, count: items.length };
  }, [data?.items]);

  const openEditModal = (r: Receita) => {
    setEditingReceita(r);
    setEditForm({
      descricao: r.descricao,
      tipo: r.tipo,
      valor: String(r.valor),
      competencia: r.competencia ? r.competencia.slice(0, 10) : "",
      vencimento: r.vencimento ? r.vencimento.slice(0, 10) : "",
      data_recebimento: r.data_recebimento ? r.data_recebimento.slice(0, 10) : "",
      status: r.status,
      categoria: r.categoria || "",
      observacao: r.observacao || "",
    });
  };

  const handleToggleStatus = async (r: Receita) => {
    if (r.status !== "pago") {
      // Abre modal para anexar comprovante e confirmar recebimento/pagamento
      setPagamentoModalItem(r);
      setPagamentoModalOpen(true);
      return;
    }

    if (!confirm(`Deseja alterar a receita "${r.descricao}" de PAGO para PENDENTE?`)) {
      return;
    }

    try {
      await updateMut.mutateAsync({
        id: r.id,
        data: {
          status: "pendente",
          data_recebimento: null,
        },
      });
      await refetch();
      toast.success(`Receita "${r.descricao}" marcada como PENDENTE!`);
    } catch {
      toast.error("Erro ao alterar status da receita");
    }
  };

  const handleDownloadComprovante = async (r: Receita) => {
    try {
      const res = await api.get(`/receitas/${r.id}/comprovante/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", r.comprovante_nome || `comprovante_${r.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Erro ao baixar comprovante.");
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReceita) return;
    try {
      await updateMut.mutateAsync({
        id: editingReceita.id,
        data: {
          descricao: editForm.descricao,
          tipo: editForm.tipo as any,
          valor: Number(editForm.valor),
          competencia: editForm.competencia,
          vencimento: editForm.vencimento || null,
          data_recebimento: editForm.data_recebimento || null,
          status: editForm.status as any,
          categoria: editForm.categoria || null,
          observacao: editForm.observacao || null,
        },
      });
      await refetch();
      toast.success("Receita atualizada com sucesso!");
      setEditingReceita(null);
    } catch {
      toast.error("Erro ao atualizar receita");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta receita?")) return;
    try {
      await deleteMut.mutateAsync(id);
      await refetch();
      toast.success("Receita excluída com sucesso");
    } catch {
      toast.error("Erro ao excluir receita");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Receitas</h1>
          <p className="text-muted-foreground">Gerencie e visualize as receitas mensais do condomínio</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setDuplicarModalOpen(true)}
            disabled={selectedMes === "all"}
            className="shadow-sm border-primary/20 hover:border-primary/50 text-foreground"
            title={
              selectedMes === "all"
                ? "Selecione um mês específico para duplicar"
                : `Duplicar receitas de ${currentMonthLabel} para o mês posterior`
            }
          >
            <Copy className="mr-2 h-4 w-4 text-primary" /> Duplicar Mês
          </Button>
          <Link href="/financeiro/receitas/nova">
            <Button className="shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> Nova Receita
            </Button>
          </Link>
        </div>
      </div>

      {/* Month Navigation & Filter Toolbar */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Quick Month Stepper */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevMonth} title="Mês anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/60 rounded-md font-medium text-sm min-w-[170px] justify-center">
                <Calendar className="h-4 w-4 text-primary" />
                <span>{currentMonthLabel}</span>
              </div>
              <Button variant="outline" size="icon" onClick={handleNextMonth} title="Próximo mês">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Dropdown Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Mês */}
              <div className="space-y-1">
                <Select value={selectedMes} onValueChange={(v) => { setSelectedMes(v); setPage(1); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ano */}
              <div className="space-y-1">
                <Select value={selectedAno} onValueChange={(v) => { setSelectedAno(v); setPage(1); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {ANOS.map((ano) => (
                      <SelectItem key={ano} value={ano}>{ano}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setPage(1); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo */}
              <div className="space-y-1">
                <Select value={selectedTipo} onValueChange={(v) => { setSelectedTipo(v); setPage(1); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Tipos</SelectItem>
                    <SelectItem value="condominio">Condomínio</SelectItem>
                    <SelectItem value="fundo_reserva">Fundo Reserva</SelectItem>
                    <SelectItem value="taxa_extra">Taxa Extra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards for the filtered month */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Previsto ({currentMonthLabel})</p>
              <h3 className="text-xl font-bold text-foreground">{formatCurrency(kpis.total)}</h3>
            </div>
            <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-lg">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Recebido</p>
              <h3 className="text-xl font-bold text-emerald-600">{formatCurrency(kpis.pago)}</h3>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Pendente / Atrasado</p>
              <h3 className="text-xl font-bold text-amber-600">{formatCurrency(kpis.pendente)}</h3>
            </div>
            <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-lg">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Quantidade de Lançamentos</p>
              <h3 className="text-xl font-bold text-foreground">{kpis.count}</h3>
            </div>
            <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left font-medium text-muted-foreground">
                  <SortableHeader field="descricao" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                    Descrição
                  </SortableHeader>
                  <SortableHeader field="tipo" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                    Tipo
                  </SortableHeader>
                  <SortableHeader field="valor" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                    Valor
                  </SortableHeader>
                  <SortableHeader field="competencia" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                    Competência
                  </SortableHeader>
                  <SortableHeader field="status" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                    Status
                  </SortableHeader>
                  <th className="p-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedReceitas.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span>{r.descricao}</span>
                        {r.comprovante_url && (
                          <button
                            type="button"
                            onClick={() => handleDownloadComprovante(r)}
                            title={`Comprovante anexado: ${r.comprovante_nome || "comprovante.pdf"}. Clique para baixar.`}
                            className="inline-flex items-center text-primary hover:text-primary/80 transition-colors p-0.5 rounded hover:bg-primary/10"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {r.categoria && <span className="text-xs text-muted-foreground">{r.categoria}</span>}
                    </td>
                    <td className="p-3">
                      <span className="text-muted-foreground">{tipoLabel[r.tipo] || r.tipo}</span>
                    </td>
                    <td className="p-3 font-semibold text-foreground">{formatCurrency(r.valor)}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(r.competencia)}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(r)}
                        title={`Clique para alternar para ${r.status === "pago" ? "Pendente" : "Pago"}`}
                        className="group inline-flex items-center focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-full"
                      >
                        <Badge
                          variant="outline"
                          className={`capitalize cursor-pointer transition-all hover:scale-105 select-none shadow-none hover:shadow-sm font-medium ${getStatusBadgeClass(
                            r.status
                          )}`}
                        >
                          {r.status}
                        </Badge>
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.comprovante_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadComprovante(r)}
                            title="Baixar comprovante anexado"
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(r)}
                          title="Editar receita"
                          className="h-8 w-8 hover:bg-muted"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(r.id)}
                          title="Excluir receita"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!data?.items || data.items.length === 0) && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <p className="font-medium">Nenhuma receita encontrada para o período selecionado.</p>
                      <p className="text-xs mt-1">Altere os filtros acima ou cadastre uma nova receita.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal Dialog */}
      <Dialog open={!!editingReceita} onOpenChange={(open) => !open && setEditingReceita(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Receita</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                required
                value={editForm.descricao}
                onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={editForm.tipo}
                  onValueChange={(v) => setEditForm({ ...editForm, tipo: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="condominio">Condomínio</SelectItem>
                    <SelectItem value="fundo_reserva">Fundo Reserva</SelectItem>
                    <SelectItem value="taxa_extra">Taxa Extra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  value={editForm.valor}
                  onChange={(e) => setEditForm({ ...editForm, valor: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Competência</Label>
                <Input
                  required
                  type="date"
                  value={editForm.competencia}
                  onChange={(e) => setEditForm({ ...editForm, competencia: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vencimento (Opcional)</Label>
                <Input
                  type="date"
                  value={editForm.vencimento}
                  onChange={(e) => setEditForm({ ...editForm, vencimento: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Data de Recebimento</Label>
                <Input
                  type="date"
                  value={editForm.data_recebimento}
                  onChange={(e) => setEditForm({ ...editForm, data_recebimento: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoria (Opcional)</Label>
              <Input
                value={editForm.categoria}
                onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Observação (Opcional)</Label>
              <Input
                value={editForm.observacao}
                onChange={(e) => setEditForm({ ...editForm, observacao: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingReceita(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMut.isPending}>
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Modal de Confirmação de Pagamento com Comprovante */}
      <ConfirmarPagamentoModal
        isOpen={pagamentoModalOpen}
        onClose={() => {
          setPagamentoModalOpen(false);
          setPagamentoModalItem(null);
        }}
        item={pagamentoModalItem}
        tipo="receitas"
        onSuccess={() => refetch()}
      />

      {/* Modal de Duplicação de Mês */}
      <DuplicarMesModal
        isOpen={duplicarModalOpen}
        onClose={() => setDuplicarModalOpen(false)}
        tipo="receitas"
        mesAtual={selectedMes === "all" ? currentDate.getMonth() + 1 : parseInt(selectedMes, 10)}
        anoAtual={selectedAno === "all" ? currentDate.getFullYear() : parseInt(selectedAno, 10)}
        onSuccess={(mesDest, anoDest) => {
          setSelectedMes(String(mesDest));
          setSelectedAno(String(anoDest));
          refetch();
        }}
      />
    </div>
  );
}

