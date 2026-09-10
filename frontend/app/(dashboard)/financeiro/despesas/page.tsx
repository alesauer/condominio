"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useDespesas, useUpdateDespesa, useDeleteDespesa } from "@/services/despesas.service";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Calendar, DollarSign, CheckCircle2, Clock, Paperclip, Download } from "lucide-react";
import { toast } from "sonner";
import type { Despesa } from "@/types/financeiro";

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
  ordinaria: "Ordinária",
  extraordinaria: "Extraordinária",
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

export default function DespesasPage() {
  const currentDate = new Date();
  const [selectedMes, setSelectedMes] = useState<string>(String(currentDate.getMonth() + 1));
  const [selectedAno, setSelectedAno] = useState<string>(String(currentDate.getFullYear()));
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedTipo, setSelectedTipo] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Modal de Edição
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  const [editForm, setEditForm] = useState({
    descricao: "",
    tipo: "ordinaria",
    valor: "",
    competencia: "",
    vencimento: "",
    data_pagamento: "",
    status: "pendente",
    categoria: "",
    observacao: "",
  });

  // Modal de Confirmação de Pagamento com Comprovante
  const [pagamentoModalItem, setPagamentoModalItem] = useState<Despesa | null>(null);
  const [pagamentoModalOpen, setPagamentoModalOpen] = useState(false);

  const queryParams = useMemo(() => {
    const params: Record<string, any> = { page, page_size: 50 };
    if (selectedMes !== "all") params.mes = parseInt(selectedMes, 10);
    if (selectedAno !== "all") params.ano = parseInt(selectedAno, 10);
    if (selectedStatus !== "all") params.status = selectedStatus;
    if (selectedTipo !== "all") params.tipo = selectedTipo;
    return params;
  }, [page, selectedMes, selectedAno, selectedStatus, selectedTipo]);

  const { data, isLoading, refetch } = useDespesas(queryParams);
  const updateMut = useUpdateDespesa();
  const deleteMut = useDeleteDespesa();

  const { items: sortedDespesas, sortField, sortDirection, requestSort } = useSortableData(
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
    const total = items.reduce((acc, d) => acc + Number(d.valor || 0), 0);
    const pago = items.filter((d) => d.status === "pago").reduce((acc, d) => acc + Number(d.valor || 0), 0);
    const pendente = items.filter((d) => d.status === "pendente" || d.status === "atrasado").reduce((acc, d) => acc + Number(d.valor || 0), 0);
    return { total, pago, pendente, count: items.length };
  }, [data?.items]);

  const openEditModal = (d: Despesa) => {
    setEditingDespesa(d);
    setEditForm({
      descricao: d.descricao,
      tipo: d.tipo,
      valor: String(d.valor),
      competencia: d.competencia ? d.competencia.slice(0, 10) : "",
      vencimento: d.vencimento ? d.vencimento.slice(0, 10) : "",
      data_pagamento: d.data_pagamento ? d.data_pagamento.slice(0, 10) : "",
      status: d.status,
      categoria: d.categoria || "",
      observacao: d.observacao || "",
    });
  };

  const handleToggleStatus = async (d: Despesa) => {
    if (d.status !== "pago") {
      // Abre modal para anexar comprovante e confirmar pagamento
      setPagamentoModalItem(d);
      setPagamentoModalOpen(true);
      return;
    }

    if (!confirm(`Deseja alterar a despesa "${d.descricao}" de PAGO para PENDENTE?`)) {
      return;
    }

    try {
      await updateMut.mutateAsync({
        id: d.id,
        data: {
          status: "pendente",
          data_pagamento: null,
        },
      });
      await refetch();
      toast.success(`Despesa "${d.descricao}" marcada como PENDENTE!`);
    } catch {
      toast.error("Erro ao alterar status da despesa");
    }
  };

  const handleDownloadComprovante = async (d: Despesa) => {
    try {
      const res = await api.get(`/despesas/${d.id}/comprovante/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", d.comprovante_nome || `comprovante_${d.id}.pdf`);
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
    if (!editingDespesa) return;
    try {
      await updateMut.mutateAsync({
        id: editingDespesa.id,
        data: {
          descricao: editForm.descricao,
          tipo: editForm.tipo as any,
          valor: Number(editForm.valor),
          competencia: editForm.competencia,
          vencimento: editForm.vencimento || null,
          data_pagamento: editForm.data_pagamento || null,
          status: editForm.status as any,
          categoria: editForm.categoria || null,
          observacao: editForm.observacao || null,
        },
      });
      await refetch();
      toast.success("Despesa atualizada com sucesso!");
      setEditingDespesa(null);
    } catch {
      toast.error("Erro ao atualizar despesa");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta despesa?")) return;
    try {
      await deleteMut.mutateAsync(id);
      await refetch();
      toast.success("Despesa excluída com sucesso");
    } catch {
      toast.error("Erro ao excluir despesa");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Despesas</h1>
          <p className="text-muted-foreground">Gerencie e visualize as despesas e contas mensais do condomínio</p>
        </div>
        <Link href="/financeiro/despesas/nova">
          <Button className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Nova Despesa
          </Button>
        </Link>
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
                    <SelectItem value="ordinaria">Ordinária</SelectItem>
                    <SelectItem value="extraordinaria">Extraordinária</SelectItem>
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
              <p className="text-xs font-medium text-muted-foreground">Total Despesas ({currentMonthLabel})</p>
              <h3 className="text-xl font-bold text-foreground">{formatCurrency(kpis.total)}</h3>
            </div>
            <div className="p-2.5 bg-rose-500/10 text-rose-600 rounded-lg">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Pago</p>
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
              <p className="text-xs font-medium text-muted-foreground">Total Pendente a Pagar</p>
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
              <p className="text-xs font-medium text-muted-foreground">Quantidade de Contas</p>
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
                  <SortableHeader field="vencimento" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                    Vencimento
                  </SortableHeader>
                  <SortableHeader field="status" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                    Status
                  </SortableHeader>
                  <th className="p-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedDespesas.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span>{d.descricao}</span>
                        {d.comprovante_url && (
                          <button
                            type="button"
                            onClick={() => handleDownloadComprovante(d)}
                            title={`Comprovante anexado: ${d.comprovante_nome || "comprovante.pdf"}. Clique para baixar.`}
                            className="inline-flex items-center text-primary hover:text-primary/80 transition-colors p-0.5 rounded hover:bg-primary/10"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {d.categoria && <span className="text-xs text-muted-foreground">{d.categoria}</span>}
                    </td>
                    <td className="p-3">
                      <span className="text-muted-foreground">{tipoLabel[d.tipo] || d.tipo}</span>
                    </td>
                    <td className="p-3 font-semibold text-foreground">{formatCurrency(d.valor)}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(d.competencia)}</td>
                    <td className="p-3 text-muted-foreground">{d.vencimento ? formatDate(d.vencimento) : "-"}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(d)}
                        title={`Clique para alternar para ${d.status === "pago" ? "Pendente" : "Pago"}`}
                        className="group inline-flex items-center focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-full"
                      >
                        <Badge
                          variant="outline"
                          className={`capitalize cursor-pointer transition-all hover:scale-105 select-none shadow-none hover:shadow-sm font-medium ${getStatusBadgeClass(
                            d.status
                          )}`}
                        >
                          {d.status}
                        </Badge>
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {d.comprovante_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadComprovante(d)}
                            title="Baixar comprovante anexado"
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(d)}
                          title="Editar despesa"
                          className="h-8 w-8 hover:bg-muted"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(d.id)}
                          title="Excluir despesa"
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
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      <p className="font-medium">Nenhuma despesa encontrada para o período selecionado.</p>
                      <p className="text-xs mt-1">Altere os filtros acima ou registre uma nova despesa.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal Dialog */}
      <Dialog open={!!editingDespesa} onOpenChange={(open) => !open && setEditingDespesa(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Despesa</DialogTitle>
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
                    <SelectItem value="ordinaria">Ordinária</SelectItem>
                    <SelectItem value="extraordinaria">Extraordinária</SelectItem>
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
                <Label>Data de Pagamento</Label>
                <Input
                  type="date"
                  value={editForm.data_pagamento}
                  onChange={(e) => setEditForm({ ...editForm, data_pagamento: e.target.value })}
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
              <Button type="button" variant="outline" onClick={() => setEditingDespesa(null)}>
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
        tipo="despesas"
        onSuccess={() => refetch()}
      />
    </div>
  );
}
