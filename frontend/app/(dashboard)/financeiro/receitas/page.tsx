"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import api from "@/lib/api"
import { useReceitas, useUpdateReceita, useDeleteReceita, useSincronizarReceitasMes } from "@/services/receitas.service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { SortableHeader } from "@/components/ui/sortable-header"
import { useSortableData } from "@/hooks/use-sortable-data"
import { ConfirmarPagamentoModal } from "@/components/financeiro/confirmar-pagamento-modal"
import { DuplicarMesModal } from "@/components/financeiro/duplicar-mes-modal"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Calendar, DollarSign, CheckCircle2, Clock, Paperclip, Download, Copy, RefreshCw, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import type { Receita } from "@/types/financeiro"

const statusLabel: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
}

const tipoLabel: Record<string, string> = {
  condominio: "Condomínio",
  fundo_reserva: "Fundo Reserva",
  taxa_extra: "Taxa Extra",
}

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
]

const ANOS = ["2024", "2025", "2026", "2027", "2028"]

import { useAuth } from "@/hooks/use-auth"
import { ReadOnlyNotice } from "@/components/auth/admin-gate"

export default function ReceitasPage() {
  const { isAdmin } = useAuth()
  const currentDate = new Date()
  const [selectedMes, setSelectedMes] = useState<string>(String(currentDate.getMonth() + 1))
  const [selectedAno, setSelectedAno] = useState<string>(String(currentDate.getFullYear()))
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedTipo, setSelectedTipo] = useState<string>("all")
  const [page, setPage] = useState(1)

  // Edit Modal State
  const [editingReceita, setEditingReceita] = useState<Receita | null>(null)
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
  })

  // Payment Modal State
  const [pagamentoModalItem, setPagamentoModalItem] = useState<Receita | null>(null)
  const [pagamentoModalOpen, setPagamentoModalOpen] = useState(false)

  // Duplication Modal State
  const [duplicarModalOpen, setDuplicarModalOpen] = useState(false)

  const queryParams = useMemo(() => {
    const params: Record<string, any> = { page, page_size: 50 }
    if (selectedMes !== "all") params.mes = parseInt(selectedMes, 10)
    if (selectedAno !== "all") params.ano = parseInt(selectedAno, 10)
    if (selectedStatus !== "all") params.status = selectedStatus
    if (selectedTipo !== "all") params.tipo = selectedTipo
    return params
  }, [page, selectedMes, selectedAno, selectedStatus, selectedTipo])

  const { data, isLoading, refetch } = useReceitas(queryParams)
  const updateMut = useUpdateReceita()
  const deleteMut = useDeleteReceita()
  const sincronizarMut = useSincronizarReceitasMes()

  const handleSincronizar = async () => {
    if (selectedMes === "all") {
      toast.error("Por favor, selecione um mês específico para sincronizar as receitas.")
      return
    }
    const mesNum = parseInt(selectedMes, 10)
    const anoNum = parseInt(selectedAno, 10)
    const competenciaStr = `${anoNum}-${String(mesNum).padStart(2, "0")}-01`

    try {
      const res = await sincronizarMut.mutateAsync({
        competencia: competenciaStr,
        mes: mesNum,
        ano: anoNum,
      })
      await refetch()
      toast.success(res.mensagem || "Receitas sincronizadas com sucesso!")
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Erro ao sincronizar receitas com as despesas do mês.")
    }
  }

  const { items: sortedReceitas, sortField, sortDirection, requestSort } = useSortableData(
    data?.items || [],
    "status",
    "asc"
  )

  const handlePrevMonth = () => {
    if (selectedMes === "all") {
      setSelectedMes("1")
      return
    }
    const m = parseInt(selectedMes, 10)
    const y = parseInt(selectedAno, 10)
    if (m === 1) {
      setSelectedMes("12")
      setSelectedAno(String(y - 1))
    } else {
      setSelectedMes(String(m - 1))
    }
    setPage(1)
  }

  const handleNextMonth = () => {
    if (selectedMes === "all") {
      setSelectedMes("12")
      return
    }
    const m = parseInt(selectedMes, 10)
    const y = parseInt(selectedAno, 10)
    if (m === 12) {
      setSelectedMes("1")
      setSelectedAno(String(y + 1))
    } else {
      setSelectedMes(String(m + 1))
    }
    setPage(1)
  }

  const currentMonthLabel = useMemo(() => {
    if (selectedMes === "all") return `Todos os meses de ${selectedAno}`
    const m = MESES.find((item) => item.value === selectedMes)
    return `${m?.label || selectedMes}/${selectedAno}`
  }, [selectedMes, selectedAno])

  const kpis = useMemo(() => {
    if (!data?.items) return { total: 0, pago: 0, pendente: 0, count: 0 }
    let total = 0
    let pago = 0
    let pendente = 0
    data.items.forEach((r) => {
      const v = Number(r.valor) || 0
      total += v
      if (r.status === "pago") pago += v
      if (r.status === "pendente" || r.status === "atrasado") pendente += v
    })
    return { total, pago, pendente, count: data.items.length }
  }, [data])

  const openEditModal = (receita: Receita) => {
    setEditingReceita(receita)
    setEditForm({
      descricao: receita.descricao,
      tipo: receita.tipo,
      valor: String(receita.valor),
      competencia: receita.competencia?.split("T")[0] || "",
      vencimento: receita.vencimento ? receita.vencimento.split("T")[0] : "",
      data_recebimento: receita.data_recebimento ? receita.data_recebimento.split("T")[0] : "",
      status: receita.status,
      categoria: receita.categoria || "",
      observacao: receita.observacao || "",
    })
  }

  const handleToggleStatus = (receita: Receita) => {
    if (receita.status === "pendente" || receita.status === "atrasado") {
      setPagamentoModalItem(receita)
      setPagamentoModalOpen(true)
    } else {
      updateMut.mutate(
        { id: receita.id, data: { status: "pendente", data_recebimento: null } },
        {
          onSuccess: () => {
            toast.success("Status alterado para Pendente")
            refetch()
          },
          onError: () => toast.error("Erro ao alterar status"),
        }
      )
    }
  }

  const handleDownloadComprovante = async (receita: Receita) => {
    try {
      const res = await api.get(`/receitas/${receita.id}/comprovante/download`, {
        responseType: "blob",
      })
      const blob = new Blob([res.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", receita.comprovante_nome || `comprovante_${receita.id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error("Erro ao baixar comprovante")
    }
  }

  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!editingReceita) return
    try {
      await updateMut.mutateAsync({
        id: editingReceita.id,
        data: {
          descricao: editForm.descricao,
          tipo: editForm.tipo as any,
          valor: parseFloat(editForm.valor) || 0,
          competencia: editForm.competencia || undefined,
          vencimento: editForm.vencimento || null,
          data_recebimento: editForm.data_recebimento || null,
          status: editForm.status as any,
          categoria: editForm.categoria || null,
          observacao: editForm.observacao || null,
        },
      })
      await refetch()
      toast.success("Receita atualizada com sucesso!")
      setEditingReceita(null)
    } catch {
      toast.error("Erro ao atualizar receita")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta receita?")) return
    try {
      await deleteMut.mutateAsync(id)
      await refetch()
      toast.success("Receita excluída com sucesso")
    } catch {
      toast.error("Erro ao excluir receita")
    }
  }

  return (
    <div className="space-y-6">
      <ReadOnlyNotice />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Receitas e Rateios
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Previsão orçamentária, rateios arrecadados e confirmação de recebimentos
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSincronizar}
              disabled={sincronizarMut.isPending || selectedMes === "all"}
              className="gap-2 text-emerald-700 hover:text-emerald-800"
              title={
                selectedMes === "all"
                  ? "Selecione um mês específico para sincronizar as receitas"
                  : `Sincronizar receitas com base nas despesas de ${currentMonthLabel}`
              }
            >
              <RefreshCw className={`h-4 w-4 ${sincronizarMut.isPending ? "animate-spin text-emerald-600" : "text-emerald-600"}`} />
              <span>{sincronizarMut.isPending ? "Sincronizando..." : "Sincronizar com Despesas"}</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDuplicarModalOpen(true)}
              disabled={selectedMes === "all"}
              className="gap-2"
            >
              <Copy className="h-4 w-4 text-slate-600" />
              <span>Duplicar Mês</span>
            </Button>
            <Link href="/financeiro/receitas/nova">
              <Button size="sm" className="gap-2 shadow-xs">
                <Plus className="h-4 w-4" />
                <span>Nova Receita</span>
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Month Stepper & Filter Toolbar */}
      <Card className="border border-slate-200 shadow-card bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Quick Month Stepper */}
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={handlePrevMonth}
                title="Mês anterior"
                className="h-9 w-9"
              >
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </Button>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs sm:text-sm text-slate-800 min-w-[180px] justify-center shadow-2xs">
                <Calendar className="h-4 w-4 text-primary-600" />
                <span>{currentMonthLabel}</span>
              </div>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleNextMonth}
                title="Próximo mês"
                className="h-9 w-9"
              >
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </Button>
            </div>

            {/* Dropdown Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Select value={selectedMes} onValueChange={(v) => { setSelectedMes(v); setPage(1); }}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedAno} onValueChange={(v) => { setSelectedAno(v); setPage(1); }}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {ANOS.map((ano) => (
                    <SelectItem key={ano} value={ano}>{ano}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setPage(1); }}>
                <SelectTrigger className="h-9 bg-white">
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

              <Select value={selectedTipo} onValueChange={(v) => { setSelectedTipo(v); setPage(1); }}>
                <SelectTrigger className="h-9 bg-white">
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
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-slate-200 shadow-card bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Previsto</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(kpis.total)}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{currentMonthLabel}</p>
            </div>
            <div className="p-2.5 bg-primary-50 text-primary-600 rounded-lg">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-card bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Recebido</p>
              <h3 className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(kpis.pago)}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Arrecadado</p>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-card bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pendente / Atrasado</p>
              <h3 className="text-xl font-bold text-amber-600 mt-1">{formatCurrency(kpis.pendente)}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">A receber</p>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-card bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lançamentos</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{kpis.count} itens</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">No período</p>
            </div>
            <div className="p-2.5 bg-primary-50 text-primary-600 rounded-lg">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
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
                  <th className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedReceitas.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        {r.apartamento_numero && (
                          <span className="inline-flex items-center rounded-md border border-primary-200 bg-primary-50 px-2 py-0.5 text-xs font-bold text-primary-700">
                            Apto {r.apartamento_numero}
                          </span>
                        )}
                        <span>{r.descricao}</span>
                        {r.comprovante_url && (
                          <button
                            type="button"
                            onClick={() => handleDownloadComprovante(r)}
                            title={`Comprovante anexado: ${r.comprovante_nome || "comprovante.pdf"}. Clique para baixar.`}
                            className="inline-flex items-center text-primary-600 hover:text-primary-800 transition-colors p-1 rounded-md hover:bg-primary-50"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {r.categoria && <span className="text-xs text-slate-500">{r.categoria}</span>}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{tipoLabel[r.tipo] || r.tipo}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">{formatCurrency(r.valor)}</td>
                    <td className="px-4 py-3.5 text-slate-600">{formatDate(r.competencia)}</td>
                    <td className="px-4 py-3.5">
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(r)}
                          title={`Clique para alternar status de ${r.status}`}
                          className="focus:outline-none cursor-pointer"
                        >
                          <span
                            className={`status-pill ${
                              r.status === "pago"
                                ? "status-pill-pago"
                                : r.status === "atrasado"
                                ? "status-pill-atrasado"
                                : "status-pill-pendente"
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            <span>{statusLabel[r.status] || r.status}</span>
                          </span>
                        </button>
                      ) : (
                        <span
                          className={`status-pill ${
                            r.status === "pago"
                              ? "status-pill-pago"
                              : r.status === "atrasado"
                              ? "status-pill-atrasado"
                              : "status-pill-pendente"
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          <span>{statusLabel[r.status] || r.status}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.comprovante_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadComprovante(r)}
                            title="Baixar comprovante anexado"
                            className="h-8 w-8 text-primary-600 hover:bg-primary-50"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(r)}
                              title="Editar receita"
                              className="h-8 w-8 text-slate-500 hover:text-slate-900"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(r.id)}
                              title="Excluir receita"
                              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(!data?.items || data.items.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                      <p className="font-semibold text-slate-700">Nenhuma receita encontrada para {currentMonthLabel}.</p>
                      <p className="text-xs text-slate-500 mt-1">A receita do condomínio provém do rateio das despesas + gás + fundo de reserva.</p>
                      {isAdmin && selectedMes !== "all" && (
                        <div className="mt-4 flex items-center justify-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleSincronizar}
                            disabled={sincronizarMut.isPending}
                            className="text-emerald-700 hover:text-emerald-800"
                          >
                            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${sincronizarMut.isPending ? "animate-spin" : ""}`} />
                            <span>{sincronizarMut.isPending ? "Sincronizando..." : "Gerar Previsão a partir das Despesas"}</span>
                          </Button>
                        </div>
                      )}
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
              <Button type="button" variant="secondary" onClick={() => setEditingReceita(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMut.isPending}>
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Confirmation Modal */}
      <ConfirmarPagamentoModal
        isOpen={pagamentoModalOpen}
        onClose={() => {
          setPagamentoModalOpen(false)
          setPagamentoModalItem(null)
        }}
        item={pagamentoModalItem}
        tipo="receitas"
        onSuccess={() => refetch()}
      />

      {/* Duplication Modal */}
      <DuplicarMesModal
        isOpen={duplicarModalOpen}
        onClose={() => setDuplicarModalOpen(false)}
        tipo="receitas"
        mesAtual={selectedMes === "all" ? currentDate.getMonth() + 1 : parseInt(selectedMes, 10)}
        anoAtual={selectedAno === "all" ? currentDate.getFullYear() : parseInt(selectedAno, 10)}
        onSuccess={(mesDest, anoDest) => {
          setSelectedMes(String(mesDest))
          setSelectedAno(String(anoDest))
          refetch()
        }}
      />
    </div>
  )
}
