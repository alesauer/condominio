"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import api from "@/lib/api"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSortableData } from "@/hooks/use-sortable-data"
import { formatDate } from "@/lib/utils"
import {
  Plus,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  Bell,
  AlertTriangle,
  Info,
  Calendar,
  Search,
  X,
  Mail,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Send,
  Eye,
  Megaphone,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { ReadOnlyNotice } from "@/components/auth/admin-gate"

const getPrioridadeBadgeStyle = (prioridade: string) => {
  switch (prioridade?.toLowerCase()) {
    case "urgente":
      return "bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-300/40"
    case "alta":
      return "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-300/40"
    case "media":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "baixa":
    default:
      return "bg-slate-50 text-slate-700 border-slate-200"
  }
}

export default function AvisosPage() {
  const { isAdmin } = useAuth()
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalAviso, setEditModalAviso] = useState<any | null>(null)
  const [viewModalAviso, setViewModalAviso] = useState<any | null>(null)

  // Create form state
  const [createForm, setCreateForm] = useState({
    titulo: "",
    descricao: "",
    prioridade: "baixa",
    enviar_email: false,
  })
  const [createLoading, setCreateLoading] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({
    titulo: "",
    descricao: "",
    prioridade: "baixa",
    enviar_email: false,
  })
  const [editLoading, setEditLoading] = useState(false)

  const qc = useQueryClient()
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["avisos", page],
    queryFn: () => api.get(`/avisos?page=${page}&page_size=20`).then((r) => r.data),
    refetchOnMount: "always",
  })

  const allAvisos = data?.items || []

  // Metrics
  const metrics = useMemo(() => {
    let urgentes = 0
    let altas = 0
    let medias = 0
    let baixas = 0

    allAvisos.forEach((a: any) => {
      const p = a.prioridade?.toLowerCase()
      if (p === "urgente") urgentes++
      else if (p === "alta") altas++
      else if (p === "media") medias++
      else baixas++
    })

    return { total: data?.total || allAvisos.length, urgentes, altas, medias, baixas }
  }, [allAvisos, data?.total])

  // Filtered avisos
  const filteredAvisos = useMemo(() => {
    return allAvisos.filter((a: any) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = a.titulo?.toLowerCase().includes(q)
        const matchDesc = a.descricao?.toLowerCase().includes(q)
        if (!matchTitle && !matchDesc) return false
      }

      if (priorityFilter !== "all" && a.prioridade?.toLowerCase() !== priorityFilter.toLowerCase()) {
        return false
      }

      return true
    })
  }, [allAvisos, searchQuery, priorityFilter])

  const { items: sortedAvisos, sortField, sortDirection, requestSort } = useSortableData(
    filteredAvisos,
    "data_publicacao",
    "desc"
  )

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este comunicado?")) return
    try {
      await api.delete(`/avisos/${id}`)
      qc.invalidateQueries({ queryKey: ["avisos"] })
      toast.success("Comunicado excluído com sucesso!")
    } catch {
      toast.error("Erro ao excluir comunicado.")
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.titulo.trim()) {
      toast.error("Preencha o título do comunicado.")
      return
    }
    if (!createForm.descricao.trim()) {
      toast.error("Preencha o conteúdo do comunicado.")
      return
    }

    setCreateLoading(true)
    try {
      await api.post("/avisos", {
        titulo: createForm.titulo.trim(),
        descricao: createForm.descricao.trim(),
        prioridade: createForm.prioridade,
        enviar_email: createForm.enviar_email,
      })
      await qc.invalidateQueries({ queryKey: ["avisos"] })
      await qc.refetchQueries({ queryKey: ["avisos"] })
      toast.success("Comunicado publicado com sucesso!")
      setCreateModalOpen(false)
      setCreateForm({ titulo: "", descricao: "", prioridade: "baixa", enviar_email: false })
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Erro ao publicar comunicado."
      toast.error(msg)
    } finally {
      setCreateLoading(false)
    }
  }

  const openEditModal = (aviso: any) => {
    setEditModalAviso(aviso)
    setEditForm({
      titulo: aviso.titulo || "",
      descricao: aviso.descricao || "",
      prioridade: aviso.prioridade || "baixa",
      enviar_email: Boolean(aviso.enviar_email),
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editModalAviso) return
    if (!editForm.titulo.trim()) {
      toast.error("Preencha o título do comunicado.")
      return
    }
    if (!editForm.descricao.trim()) {
      toast.error("Preencha o conteúdo do comunicado.")
      return
    }

    setEditLoading(true)
    try {
      await api.put(`/avisos/${editModalAviso.id}`, {
        titulo: editForm.titulo.trim(),
        descricao: editForm.descricao.trim(),
        prioridade: editForm.prioridade,
        enviar_email: editForm.enviar_email,
      })
      await qc.invalidateQueries({ queryKey: ["avisos"] })
      toast.success("Comunicado atualizado com sucesso!")
      setEditModalAviso(null)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Erro ao atualizar comunicado."
      toast.error(msg)
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <ReadOnlyNotice />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <span>Mural de Avisos e Comunicados</span>
            <Badge variant="outline" className="text-xs font-normal border-slate-200 text-slate-600 bg-white">
              Comunicação Oficial
            </Badge>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Publicações, informativos gerais, avisos urgentes e comunicados oficiais aos condôminos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs text-slate-600 border-slate-200 hover:bg-slate-50"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Atualizar lista"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-primary-600" : ""}`} />
            <span>Atualizar</span>
          </Button>

          {isAdmin && (
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="h-9 gap-2 shadow-xs bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Aviso</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="border border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total de Comunicados</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
              <Megaphone className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Urgentes</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">{metrics.urgentes}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Alta Prioridade</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{metrics.altas}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Bell className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Informativos Gerais</p>
              <h3 className="text-2xl font-bold text-primary-700 mt-1">{metrics.medias + metrics.baixas}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-primary-50 text-primary-600">
              <Info className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Toolbar */}
      <Card className="border border-slate-200 bg-white shadow-2xs">
        <CardContent className="p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <Input
              placeholder="Buscar comunicados por assunto ou texto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-slate-50/70 border-slate-200"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <Button
              variant={priorityFilter === "all" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={() => setPriorityFilter("all")}
            >
              Todos ({allAvisos.length})
            </Button>
            <Button
              variant={priorityFilter === "urgente" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs font-medium text-rose-700"
              onClick={() => setPriorityFilter("urgente")}
            >
              Urgente ({metrics.urgentes})
            </Button>
            <Button
              variant={priorityFilter === "alta" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs font-medium text-amber-700"
              onClick={() => setPriorityFilter("alta")}
            >
              Alta ({metrics.altas})
            </Button>
            <Button
              variant={priorityFilter === "media" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs font-medium text-blue-700"
              onClick={() => setPriorityFilter("media")}
            >
              Média ({metrics.medias})
            </Button>
            <Button
              variant={priorityFilter === "baixa" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs font-medium text-slate-700"
              onClick={() => setPriorityFilter("baixa")}
            >
              Baixa ({metrics.baixas})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Avisos List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3.5">
          {sortedAvisos.map((a: any) => {
            const isUrgente = a.prioridade?.toLowerCase() === "urgente"
            const isAlta = a.prioridade?.toLowerCase() === "alta"

            return (
              <Card
                key={a.id}
                className={`border bg-white shadow-card hover:border-slate-300 transition-all rounded-2xl overflow-hidden ${
                  isUrgente
                    ? "border-rose-200 ring-1 ring-rose-100"
                    : isAlta
                    ? "border-amber-200 ring-1 ring-amber-100"
                    : "border-slate-200"
                }`}
              >
                <CardHeader className="pb-2.5 bg-slate-50/40 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 ${
                          isUrgente
                            ? "bg-rose-100 text-rose-700"
                            : isAlta
                            ? "bg-amber-100 text-amber-700"
                            : "bg-primary-50 text-primary-700"
                        }`}
                      >
                        {isUrgente ? (
                          <AlertTriangle className="h-5 w-5" />
                        ) : isAlta ? (
                          <Bell className="h-5 w-5" />
                        ) : (
                          <Info className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-base font-bold text-slate-900 leading-snug">
                            {a.titulo}
                          </CardTitle>
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${getPrioridadeBadgeStyle(
                              a.prioridade
                            )}`}
                          >
                            {a.prioridade}
                          </span>
                          {a.enviar_email && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium">
                              <Mail className="h-3 w-3" />
                              <span>Enviado por E-mail</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>Publicado em: {formatDate(a.data_publicacao)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 self-end sm:self-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-slate-600 hover:text-primary-700 hover:bg-primary-50 gap-1"
                        onClick={() => setViewModalAviso(a)}
                        title="Visualizar aviso completo"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Ver</span>
                      </Button>

                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            onClick={() => openEditModal(a)}
                            title="Editar comunicado"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(a.id)}
                            title="Excluir comunicado"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-3.5 pb-4">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {a.descricao}
                  </p>
                </CardContent>
              </Card>
            )
          })}

          {sortedAvisos.length === 0 && (
            <div className="py-14 text-center text-sm text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-card">
              <Megaphone className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">Nenhum comunicado encontrado</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                {searchQuery || priorityFilter !== "all"
                  ? "Tente ajustar os filtros ou a busca para encontrar registros."
                  : "Clique no botão 'Novo Aviso' para publicar comunicados para os condôminos."}
              </p>
              {(searchQuery || priorityFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={() => {
                    setSearchQuery("")
                    setPriorityFilter("all")
                  }}
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          )}

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between pt-3">
              <span className="text-xs text-slate-500">
                Mostrando {data.items.length} de {data.total} comunicados
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="text-xs"
                >
                  Anterior
                </Button>
                <span className="text-xs font-medium text-slate-600 px-2">
                  Página {page} de {data.total_pages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= data.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-xs"
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Publicar Novo Aviso */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg bg-white rounded-2xl">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-primary-600">
                <Bell className="h-5 w-5" />
                <DialogTitle className="text-base font-bold text-slate-900">
                  Publicar Novo Comunicado
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Crie um comunicado oficial que será exibido no mural e enviado aos condôminos
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="create_titulo" className="text-xs font-semibold text-slate-700">
                  Título do Comunicado <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="create_titulo"
                  required
                  placeholder="Ex: Manutenção nos elevadores"
                  value={createForm.titulo}
                  onChange={(e) => setCreateForm({ ...createForm, titulo: e.target.value })}
                  className="text-xs bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="create_prioridade" className="text-xs font-semibold text-slate-700">
                    Nível de Prioridade
                  </Label>
                  <Select
                    value={createForm.prioridade}
                    onValueChange={(v) => setCreateForm({ ...createForm, prioridade: v })}
                  >
                    <SelectTrigger id="create_prioridade" className="text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.enviar_email}
                      onChange={(e) => setCreateForm({ ...createForm, enviar_email: e.target.checked })}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                    />
                    <span className="text-xs font-medium text-slate-800 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-primary-600" />
                      <span>Notificar por E-mail</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create_descricao" className="text-xs font-semibold text-slate-700">
                  Mensagem Completa <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="create_descricao"
                  rows={5}
                  required
                  placeholder="Insira as informações detalhadas do comunicado..."
                  value={createForm.descricao}
                  onChange={(e) => setCreateForm({ ...createForm, descricao: e.target.value })}
                  className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                disabled={createLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createLoading}
                className="gap-1.5 bg-primary-600 hover:bg-primary-700 shadow-2xs"
              >
                {createLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Publicando...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Publicar Aviso</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Editar Aviso */}
      <Dialog open={!!editModalAviso} onOpenChange={(open) => !open && setEditModalAviso(null)}>
        <DialogContent className="max-w-lg bg-white rounded-2xl">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-primary-600">
                <Edit3 className="h-5 w-5" />
                <DialogTitle className="text-base font-bold text-slate-900">
                  Editar Comunicado
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Atualize o título, prioridade ou conteúdo deste comunicado
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit_titulo" className="text-xs font-semibold text-slate-700">
                  Título do Comunicado <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit_titulo"
                  required
                  value={editForm.titulo}
                  onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })}
                  className="text-xs bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_prioridade" className="text-xs font-semibold text-slate-700">
                    Nível de Prioridade
                  </Label>
                  <Select
                    value={editForm.prioridade}
                    onValueChange={(v) => setEditForm({ ...editForm, prioridade: v })}
                  >
                    <SelectTrigger id="edit_prioridade" className="text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.enviar_email}
                      onChange={(e) => setEditForm({ ...editForm, enviar_email: e.target.checked })}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                    />
                    <span className="text-xs font-medium text-slate-800 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-primary-600" />
                      <span>Notificar por E-mail</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit_descricao" className="text-xs font-semibold text-slate-700">
                  Mensagem Completa <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="edit_descricao"
                  rows={5}
                  required
                  value={editForm.descricao}
                  onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                  className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalAviso(null)}
                disabled={editLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={editLoading}
                className="gap-1.5 bg-primary-600 hover:bg-primary-700 shadow-2xs"
              >
                {editLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Visualizar Aviso Completo */}
      <Dialog open={!!viewModalAviso} onOpenChange={(open) => !open && setViewModalAviso(null)}>
        <DialogContent className="max-w-lg bg-white rounded-2xl">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-primary-600">
              <Megaphone className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-slate-900">
                {viewModalAviso?.titulo}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Publicado em {viewModalAviso && formatDate(viewModalAviso.data_publicacao)}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${getPrioridadeBadgeStyle(
                  viewModalAviso?.prioridade
                )}`}
              >
                Prioridade {viewModalAviso?.prioridade}
              </span>
              {viewModalAviso?.enviar_email && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs font-medium">
                  <Mail className="h-3.5 w-3.5" />
                  <span>Enviado por E-mail</span>
                </span>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
              {viewModalAviso?.descricao}
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setViewModalAviso(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
