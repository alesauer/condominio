"use client"

import { useState, useRef, useMemo, useEffect } from "react"
import Link from "next/link"
import api from "@/lib/api"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
import { formatDate } from "@/lib/utils"
import {
  Plus,
  Trash2,
  CalendarDays,
  MapPin,
  Clock,
  Download,
  FileText,
  Paperclip,
  UploadCloud,
  FileCheck,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Search,
  Printer,
  ExternalLink,
  Edit3,
  Sparkles,
  FileImage,
  FileType,
  Layers,
} from "lucide-react"
import { toast } from "sonner"

interface PautaItem {
  id?: string
  ordem: number
  descricao: string
}

export default function AssembleiasPage() {
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "realizadas" | "agendadas" | "com_anexo" | "sem_anexo">("all")
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [expandedPautas, setExpandedPautas] = useState<Record<string, boolean>>({})

  // Modals state
  const [viewAtaAssembleia, setViewAtaAssembleia] = useState<any | null>(null)
  const [attachAtaAssembleia, setAttachAtaAssembleia] = useState<any | null>(null)
  const [editAssembleia, setEditAssembleia] = useState<any | null>(null)
  const [previewDoc, setPreviewDoc] = useState<{ assembleia: any; url: string; mimeType: string; isPdf: boolean; isImage: boolean } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Attach Modal Form
  const [modalFile, setModalFile] = useState<File | null>(null)
  const [modalConteudo, setModalConteudo] = useState("")
  const [modalLoading, setModalLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit Modal Form
  const [editForm, setEditForm] = useState({
    titulo: "",
    data: "",
    hora_inicio: "",
    hora_fim: "",
    local: "",
    descricao: "",
    ata_conteudo: "",
  })
  const [editPautas, setEditPautas] = useState<PautaItem[]>([])
  const [editLoading, setEditLoading] = useState(false)

  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["assembleias", page],
    queryFn: () => api.get(`/assembleias?page=${page}&page_size=30`).then((r) => r.data),
  })

  // Cleanup object URLs on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (previewDoc?.url) {
        window.URL.revokeObjectURL(previewDoc.url)
      }
    }
  }, [previewDoc])

  const isPastDate = (dateStr: string) => {
    if (!dateStr) return false
    const today = new Date().toISOString().split("T")[0]
    return dateStr < today
  }

  const togglePautas = (id: string) => {
    setExpandedPautas((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const allItems = data?.items || []

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = allItems.length
    let realizadas = 0
    let agendadas = 0
    let comAnexo = 0

    allItems.forEach((a: any) => {
      if (isPastDate(a.data)) realizadas++
      else agendadas++
      if (a.ata?.arquivo_path) comAnexo++
    })

    return { total, realizadas, agendadas, comAnexo }
  }, [allItems])

  // Filtered and searched list
  const filteredAssembleias = useMemo(() => {
    return allItems.filter((a: any) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = a.titulo?.toLowerCase().includes(q)
        const matchLocal = a.local?.toLowerCase().includes(q)
        const matchDesc = a.descricao?.toLowerCase().includes(q)
        const matchAta = a.ata?.conteudo?.toLowerCase().includes(q)
        const matchPauta = a.pautas?.some((p: any) => p.descricao?.toLowerCase().includes(q))
        if (!matchTitle && !matchLocal && !matchDesc && !matchAta && !matchPauta) {
          return false
        }
      }

      // Status filter
      const past = isPastDate(a.data)
      if (statusFilter === "realizadas" && !past) return false
      if (statusFilter === "agendadas" && past) return false
      if (statusFilter === "com_anexo" && !a.ata?.arquivo_path) return false
      if (statusFilter === "sem_anexo" && a.ata?.arquivo_path) return false

      return true
    })
  }, [allItems, searchQuery, statusFilter])

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta assembleia e todos os seus registros associados?")) return
    try {
      await api.delete(`/assembleias/${id}`)
      qc.invalidateQueries({ queryKey: ["assembleias"] })
      toast.success("Assembleia excluída com sucesso!")
    } catch {
      toast.error("Erro ao excluir assembleia.")
    }
  }

  const handleDownloadAta = async (assembleia: any) => {
    try {
      setDownloadingId(assembleia.id)
      const res = await api.get(`/assembleias/${assembleia.id}/ata/download`, {
        responseType: "blob",
      })
      const ext = assembleia.ata?.arquivo_path?.split(".").pop() || "pdf"
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement("a")
      link.href = url
      const safeTitle = (assembleia.titulo || "ata").replace(/[^a-zA-Z0-9_-]/g, "_")
      link.setAttribute("download", `Ata_${assembleia.data}_${safeTitle}.${ext}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success("Download do arquivo concluído com sucesso!")
    } catch {
      toast.error("Erro ao baixar o arquivo da ata.")
    } finally {
      setDownloadingId(null)
    }
  }

  const handlePreviewAta = async (assembleia: any) => {
    if (!assembleia.ata?.arquivo_path) return
    try {
      setPreviewLoading(true)
      const res = await api.get(`/assembleias/${assembleia.id}/ata/view`, {
        responseType: "blob",
      })
      const ext = assembleia.ata.arquivo_path.split(".").pop()?.toLowerCase() || ""
      const isPdf = ext === "pdf" || res.data.type === "application/pdf"
      const isImage = ["png", "jpg", "jpeg", "webp"].includes(ext) || res.data.type.startsWith("image/")

      const blobUrl = window.URL.createObjectURL(
        new Blob([res.data], { type: res.data.type || (isPdf ? "application/pdf" : "application/octet-stream") })
      )

      setPreviewDoc({
        assembleia,
        url: blobUrl,
        mimeType: res.data.type || (isPdf ? "application/pdf" : "image/jpeg"),
        isPdf,
        isImage,
      })
    } catch {
      toast.error("Não foi possível carregar a prévia do documento. Você pode baixá-lo diretamente.")
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleDeleteAtaFile = async (assembleia: any) => {
    if (!confirm("Deseja realmente remover o arquivo anexado a esta ata?")) return
    try {
      await api.delete(`/assembleias/${assembleia.id}/ata/file`)
      qc.invalidateQueries({ queryKey: ["assembleias"] })
      toast.success("Arquivo anexo removido com sucesso!")
      if (previewDoc?.assembleia?.id === assembleia.id) {
        setPreviewDoc(null)
      }
    } catch {
      toast.error("Erro ao remover o arquivo anexo.")
    }
  }

  const openAttachModal = (assembleia: any) => {
    setAttachAtaAssembleia(assembleia)
    setModalConteudo(assembleia.ata?.conteudo || "")
    setModalFile(null)
  }

  const handleSaveAtaModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!attachAtaAssembleia) return
    if (!modalFile && !modalConteudo.trim()) {
      toast.error("Selecione um arquivo ou preencha o resumo da ata.")
      return
    }

    setModalLoading(true)
    try {
      const formData = new FormData()
      if (modalFile) {
        formData.append("file", modalFile)
      }
      if (modalConteudo.trim()) {
        formData.append("conteudo", modalConteudo.trim())
      }

      await api.post(`/assembleias/${attachAtaAssembleia.id}/ata`, formData)
      qc.invalidateQueries({ queryKey: ["assembleias"] })
      toast.success("Ata e anexos atualizados com sucesso!")
      setAttachAtaAssembleia(null)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Erro ao salvar ata."
      toast.error(msg)
    } finally {
      setModalLoading(false)
    }
  }

  const openEditModal = (assembleia: any) => {
    setEditAssembleia(assembleia)
    setEditForm({
      titulo: assembleia.titulo || "",
      data: assembleia.data || "",
      hora_inicio: assembleia.hora_inicio ? assembleia.hora_inicio.slice(0, 5) : "",
      hora_fim: assembleia.hora_fim ? assembleia.hora_fim.slice(0, 5) : "",
      local: assembleia.local || "",
      descricao: assembleia.descricao || "",
      ata_conteudo: assembleia.ata?.conteudo || "",
    })
    setEditPautas(
      assembleia.pautas && assembleia.pautas.length > 0
        ? assembleia.pautas.map((p: any, idx: number) => ({ ordem: idx + 1, descricao: p.descricao }))
        : [{ ordem: 1, descricao: "" }]
    )
  }

  const handleSaveEditModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editAssembleia) return
    if (!editForm.titulo.trim()) {
      toast.error("Preencha o título da assembleia.")
      return
    }
    if (!editForm.data) {
      toast.error("Selecione a data da assembleia.")
      return
    }

    setEditLoading(true)
    try {
      const validPautas = editPautas
        .filter((p) => p.descricao.trim().length > 0)
        .map((p, idx) => ({ ordem: idx + 1, descricao: p.descricao.trim() }))

      const payload = {
        titulo: editForm.titulo.trim(),
        data: editForm.data,
        hora_inicio: editForm.hora_inicio || null,
        hora_fim: editForm.hora_fim || null,
        local: editForm.local.trim() || null,
        descricao: editForm.descricao.trim() || null,
        pautas: validPautas,
        ata_conteudo: editForm.ata_conteudo.trim() || null,
      }

      await api.put(`/assembleias/${editAssembleia.id}`, payload)
      qc.invalidateQueries({ queryKey: ["assembleias"] })
      toast.success("Assembleia atualizada com sucesso!")
      setEditAssembleia(null)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Erro ao atualizar dados da assembleia."
      toast.error(msg)
    } finally {
      setEditLoading(false)
    }
  }

  const getFileName = (path?: string) => {
    if (!path) return "Documento Anexo"
    const name = path.split("/").pop() || path
    return name
  }

  const getFileExtension = (path?: string) => {
    if (!path) return "DOC"
    const ext = path.split(".").pop()?.toUpperCase() || "DOC"
    return ext
  }

  const getFileBadgeColor = (ext: string) => {
    const e = ext.toUpperCase()
    if (e === "PDF") return "bg-red-50 text-red-700 border-red-200"
    if (["PNG", "JPG", "JPEG", "WEBP"].includes(e)) return "bg-emerald-50 text-emerald-700 border-emerald-200"
    if (["DOC", "DOCX"].includes(e)) return "bg-blue-50 text-blue-700 border-blue-200"
    return "bg-slate-50 text-slate-700 border-slate-200"
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <span>Assembleias e Atas</span>
            <Badge variant="outline" className="text-xs font-normal border-slate-200 text-slate-600 bg-white">
              Gestão Coletiva
            </Badge>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Histórico completo de reuniões, convocações, pautas debatidas, atas digitalizadas e deliberações oficiais
          </p>
        </div>
        <Link href="/assembleias/nova">
          <Button className="gap-2 shadow-xs bg-primary-600 hover:bg-primary-700">
            <Plus className="h-4 w-4" />
            <span>Nova Assembleia</span>
          </Button>
        </Link>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="border border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total de Assembleias</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
              <CalendarDays className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Realizadas</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.realizadas}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Agendadas / Convocadas</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.agendadas}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Com Ata Anexa</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">{metrics.comAnexo}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
              <Paperclip className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border border-slate-200 bg-white shadow-2xs">
        <CardContent className="p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <Input
              placeholder="Buscar por título, pauta, ata ou local..."
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
              variant={statusFilter === "all" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={() => setStatusFilter("all")}
            >
              Todas ({allItems.length})
            </Button>
            <Button
              variant={statusFilter === "realizadas" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs font-medium text-emerald-700"
              onClick={() => setStatusFilter("realizadas")}
            >
              Realizadas ({metrics.realizadas})
            </Button>
            <Button
              variant={statusFilter === "agendadas" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs font-medium text-blue-700"
              onClick={() => setStatusFilter("agendadas")}
            >
              Agendadas ({metrics.agendadas})
            </Button>
            <Button
              variant={statusFilter === "com_anexo" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs font-medium text-slate-700"
              onClick={() => setStatusFilter("com_anexo")}
            >
              <Paperclip className="h-3.5 w-3.5 mr-1" />
              Com Arquivo ({metrics.comAnexo})
            </Button>
            <Button
              variant={statusFilter === "sem_anexo" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs font-medium text-amber-700"
              onClick={() => setStatusFilter("sem_anexo")}
            >
              Sem Arquivo ({allItems.length - metrics.comAnexo})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assembleias Listing */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAssembleias.map((a: any) => {
            const hasAtaFile = Boolean(a.ata?.arquivo_path)
            const hasAtaText = Boolean(a.ata?.conteudo && a.ata.conteudo.trim().length > 0)
            const hasPautas = a.pautas && a.pautas.length > 0
            const isPautasExpanded = expandedPautas[a.id]
            const past = isPastDate(a.data)
            const fileExt = getFileExtension(a.ata?.arquivo_path)

            return (
              <Card
                key={a.id}
                className="border border-slate-200 bg-white shadow-card hover:border-slate-300 transition-all rounded-2xl overflow-hidden"
              >
                {/* Header Card */}
                <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      {/* Icon Callout */}
                      <div
                        className={`p-3 rounded-xl shrink-0 mt-0.5 flex flex-col items-center justify-center min-w-[52px] ${
                          past
                            ? "bg-slate-100 text-slate-700 border border-slate-200"
                            : "bg-primary-50 text-primary-700 border border-primary-200 font-semibold"
                        }`}
                      >
                        <CalendarDays className="h-5 w-5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">
                          {a.data ? a.data.split("-")[1] + "/" + a.data.split("-")[0].slice(2) : "DATA"}
                        </span>
                      </div>

                      <div>
                        {/* Title and Status Badge */}
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-base font-bold text-slate-900 leading-snug">
                            {a.titulo}
                          </CardTitle>
                          <span
                            className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full uppercase tracking-wider ${
                              past
                                ? "bg-slate-100 text-slate-700 border border-slate-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {past ? "Realizada" : "Agendada / Convocada"}
                          </span>
                          {hasAtaFile && (
                            <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <Paperclip className="h-3 w-3" />
                              <span>Ata Digitalizada</span>
                            </span>
                          )}
                        </div>

                        {/* Metadata: Data, Horário e Local */}
                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 mt-2.5 font-medium">
                          <span className="flex items-center gap-1.5 bg-white text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                            <CalendarDays className="h-3.5 w-3.5 text-primary-600" />
                            <span>{formatDate(a.data)}</span>
                          </span>

                          {(a.hora_inicio || a.hora_fim) && (
                            <span className="flex items-center gap-1.5 bg-white text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span>
                                {a.hora_inicio && a.hora_fim
                                  ? `${a.hora_inicio.slice(0, 5)} às ${a.hora_fim.slice(0, 5)}`
                                  : a.hora_inicio
                                  ? `Início: ${a.hora_inicio.slice(0, 5)}`
                                  : `Término: ${a.hora_fim.slice(0, 5)}`}
                              </span>
                            </span>
                          )}

                          {a.local && (
                            <span className="flex items-center gap-1.5 bg-white text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              <span>{a.local}</span>
                            </span>
                          )}

                          {hasPautas && (
                            <span className="flex items-center gap-1.5 bg-white text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                              <Layers className="h-3.5 w-3.5 text-slate-400" />
                              <span>{a.pautas.length} pauta(s)</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Top Action Buttons */}
                    <div className="flex items-center gap-1 self-end sm:self-start">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-slate-600 hover:text-primary-700 hover:bg-primary-50 gap-1.5"
                        onClick={() => setViewAtaAssembleia(a)}
                        title="Ver resumo oficial da ata"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">Ver Ata</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        onClick={() => openEditModal(a)}
                        title="Editar assembleia e pautas"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(a.id)}
                        title="Excluir assembleia"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Convocação / Descrição Geral */}
                  {a.descricao && (
                    <div className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] mb-1">
                        Convocação / Descrição Geral
                      </p>
                      <p className="whitespace-pre-line">{a.descricao}</p>
                    </div>
                  )}

                  {/* Pautas da Reunião */}
                  {hasPautas && (
                    <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden">
                      <button
                        type="button"
                        onClick={() => togglePautas(a.id)}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-primary-600" />
                          <span>Pautas da Ordem do Dia ({a.pautas.length})</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 text-xs font-normal">
                          <span>{isPautasExpanded ? "Ocultar pautas" : "Ver pautas"}</span>
                          {isPautasExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </div>
                      </button>

                      {isPautasExpanded && (
                        <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-slate-100 bg-slate-50/30">
                          {a.pautas.map((p: any) => (
                            <div key={p.id || p.ordem} className="flex items-start gap-2.5 text-xs text-slate-700">
                              <span className="flex items-center justify-center h-5 w-5 rounded bg-primary-100 text-primary-700 font-bold text-[10px] shrink-0 mt-0.5">
                                {p.ordem}º
                              </span>
                              <span className="leading-relaxed">{p.descricao}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Seção Destacada: Ata e Arquivos Anexos */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                        <span>Ata e Arquivos Anexados</span>
                      </span>
                    </div>

                    {hasAtaFile || hasAtaText ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Arquivo Anexo Card */}
                        {hasAtaFile ? (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70 transition-all gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                                {fileExt === "PDF" ? (
                                  <FileType className="h-5 w-5 text-red-600" />
                                ) : ["PNG", "JPG", "JPEG"].includes(fileExt) ? (
                                  <FileImage className="h-5 w-5 text-emerald-600" />
                                ) : (
                                  <FileCheck className="h-5 w-5 text-emerald-700" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {getFileName(a.ata?.arquivo_path)}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getFileBadgeColor(fileExt)}`}>
                                    .{fileExt}
                                  </span>
                                  <span className="text-[11px] text-emerald-700 font-medium">
                                    Documento Oficial Anexo
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Attachment Action Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                              {/* Preview Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 text-xs text-slate-700 border-slate-300 bg-white hover:bg-slate-100"
                                onClick={() => handlePreviewAta(a)}
                                title="Visualizar prévia do arquivo"
                              >
                                <Eye className="h-3.5 w-3.5 text-slate-600" />
                                <span>Ver</span>
                              </Button>

                              {/* Download Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 text-xs text-emerald-700 border-emerald-300 bg-white hover:bg-emerald-100"
                                onClick={() => handleDownloadAta(a)}
                                disabled={downloadingId === a.id}
                                title="Baixar arquivo da ata"
                              >
                                {downloadingId === a.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Download className="h-3.5 w-3.5 text-emerald-600" />
                                )}
                                <span>Baixar</span>
                              </Button>

                              {/* Delete Attachment Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteAtaFile(a)}
                                title="Excluir apenas o arquivo anexo"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-xs text-slate-500">
                            <span className="text-slate-400">Nenhum arquivo digitalizado anexado.</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-primary-600 hover:bg-primary-50 font-medium"
                              onClick={() => openAttachModal(a)}
                            >
                              + Anexar Arquivo
                            </Button>
                          </div>
                        )}

                        {/* Texto / Resumo da Ata Card */}
                        {hasAtaText ? (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50/70 transition-all gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2.5 rounded-lg bg-blue-100 text-blue-800 shrink-0">
                                <FileText className="h-5 w-5 text-blue-700" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {a.ata?.conteudo.slice(0, 45)}...
                                </p>
                                <p className="text-[11px] text-blue-700 font-medium">
                                  Resumo / Decisões Registradas
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 text-xs text-blue-700 border-blue-300 bg-white hover:bg-blue-100 shrink-0 self-end sm:self-auto"
                              onClick={() => setViewAtaAssembleia(a)}
                              title="Visualizar texto da ata"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-600" />
                              <span>Ler Resumo</span>
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-xs text-slate-500">
                            <span className="text-slate-400">Nenhum resumo em texto registrado.</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-primary-600 hover:bg-primary-50 font-medium"
                              onClick={() => openAttachModal(a)}
                            >
                              + Adicionar Texto
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-dashed border-amber-200 bg-amber-50/40 text-xs text-amber-800 gap-2.5">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                          <span>Esta assembleia ainda não possui ata ou documento oficial anexado.</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-amber-900 border-amber-300 bg-white hover:bg-amber-100 font-semibold gap-1.5 shadow-2xs shrink-0 self-end sm:self-auto"
                          onClick={() => openAttachModal(a)}
                        >
                          <Paperclip className="h-3.5 w-3.5 text-amber-700" />
                          <span>Anexar Arquivo / Registrar Ata</span>
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <span className="text-[11px] text-slate-400">
                      ID: <span className="font-mono">{a.id.slice(0, 8)}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-slate-700 hover:bg-slate-100"
                        onClick={() => openAttachModal(a)}
                      >
                        <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                        <span>{hasAtaFile || hasAtaText ? "Gerenciar / Trocar Ata" : "Anexar Documento"}</span>
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 gap-1.5 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100"
                        onClick={() => setViewAtaAssembleia(a)}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Ver Detalhes Oficiais</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {filteredAssembleias.length === 0 && (
            <div className="py-14 text-center text-sm text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-card">
              <CalendarDays className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">Nenhuma assembleia encontrada</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                {searchQuery || statusFilter !== "all"
                  ? "Tente ajustar os filtros ou a busca para encontrar registros."
                  : "Clique no botão 'Nova Assembleia' para cadastrar reuniões, pautas e atas."}
              </p>
              {(searchQuery || statusFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={() => {
                    setSearchQuery("")
                    setStatusFilter("all")
                  }}
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Pré-visualização de Documento Anexo (PDF / Imagens) */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl bg-white rounded-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b border-slate-200 bg-slate-50/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary-100 text-primary-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">
                    Pré-visualização do Anexo da Ata
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    {previewDoc?.assembleia?.titulo} • {previewDoc && formatDate(previewDoc.assembleia.data)}
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Document Content View */}
          <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[450px]">
            {previewDoc?.isPdf ? (
              <iframe
                src={`${previewDoc.url}#toolbar=1&navpanes=0`}
                className="w-full h-[65vh] rounded-xl border border-slate-300 bg-white shadow-inner"
                title="Prévia do PDF"
              />
            ) : previewDoc?.isImage ? (
              <div className="max-h-[65vh] overflow-auto flex items-center justify-center p-2">
                <img
                  src={previewDoc.url}
                  alt="Anexo da Ata"
                  className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-md"
                />
              </div>
            ) : (
              <div className="text-center py-12 px-4 bg-white rounded-xl border border-slate-200 shadow-xs max-w-md">
                <FileType className="h-12 w-12 text-primary-600 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-900">Prévia direta não disponível para este formato</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  O arquivo é do tipo .{previewDoc ? getFileExtension(previewDoc.assembleia?.ata?.arquivo_path) : "DOC"} e pode ser baixado para visualização completa no seu computador.
                </p>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => previewDoc && handleDownloadAta(previewDoc.assembleia)}
                >
                  <Download className="h-4 w-4" />
                  <span>Baixar Arquivo Completo</span>
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="p-3 border-t border-slate-200 bg-white flex items-center justify-between sm:justify-between">
            <div className="flex items-center gap-2">
              {previewDoc?.url && (
                <a href={previewDoc.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs text-slate-700">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Abrir em Nova Aba</span>
                  </Button>
                </a>
              )}
              {previewDoc && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                  onClick={() => handleDownloadAta(previewDoc.assembleia)}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Baixar Arquivo</span>
                </Button>
              )}
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPreviewDoc(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Visualizar Detalhes Oficiais da Ata / Assembleia */}
      <Dialog open={!!viewAtaAssembleia} onOpenChange={(open) => !open && setViewAtaAssembleia(null)}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary-600">
                <FileText className="h-5 w-5" />
                <DialogTitle className="text-base font-bold text-slate-900">
                  Ata Oficial e Detalhes da Assembleia
                </DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-slate-600 hover:text-slate-900 print:hidden"
                onClick={() => window.print()}
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Imprimir</span>
              </Button>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Registro formal e deliberações da reunião condominial
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-slate-800">
            {/* Header / Info Timbrado */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Título da Reunião</span>
                <h3 className="text-base font-bold text-slate-900">{viewAtaAssembleia?.titulo}</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Data de Realização:</span>
                  <span className="font-semibold text-slate-800">{viewAtaAssembleia && formatDate(viewAtaAssembleia.data)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Horário:</span>
                  <span className="font-semibold text-slate-800">
                    {viewAtaAssembleia?.hora_inicio
                      ? `${viewAtaAssembleia.hora_inicio.slice(0, 5)} ${viewAtaAssembleia.hora_fim ? `às ${viewAtaAssembleia.hora_fim.slice(0, 5)}` : ""}`
                      : "Não informado"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Local:</span>
                  <span className="font-semibold text-slate-800">{viewAtaAssembleia?.local || "Salão de Festas"}</span>
                </div>
              </div>
            </div>

            {/* Descrição / Convocação */}
            {viewAtaAssembleia?.descricao && (
              <div className="space-y-1">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Convocação & Informações Preliminares
                </Label>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs leading-relaxed text-slate-700 whitespace-pre-line">
                  {viewAtaAssembleia.descricao}
                </div>
              </div>
            )}

            {/* Pautas */}
            {viewAtaAssembleia?.pautas && viewAtaAssembleia.pautas.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Ordem do Dia / Pautas Debatidas
                </Label>
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  {viewAtaAssembleia.pautas.map((p: any) => (
                    <div key={p.id || p.ordem} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <span className="flex items-center justify-center h-5 w-5 rounded bg-primary-100 text-primary-700 font-bold text-[10px] shrink-0 mt-0.5">
                        {p.ordem}º
                      </span>
                      <span className="leading-relaxed">{p.descricao}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Texto / Deliberações da Ata */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Conteúdo & Deliberações da Ata
              </Label>
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                {viewAtaAssembleia?.ata?.conteudo || "Nenhum texto de resumo registrado para esta ata."}
              </div>
            </div>

            {/* Documento Anexo */}
            {viewAtaAssembleia?.ata?.arquivo_path && (
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                    <FileCheck className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {getFileName(viewAtaAssembleia.ata.arquivo_path)}
                    </p>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      Documento oficial digitalizado e assinado
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs text-slate-700 bg-white"
                    onClick={() => {
                      setViewAtaAssembleia(null)
                      handlePreviewAta(viewAtaAssembleia)
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Visualizar</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs text-emerald-700 border-emerald-300 bg-white hover:bg-emerald-100"
                    onClick={() => handleDownloadAta(viewAtaAssembleia)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Baixar</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between sm:justify-between w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                const a = viewAtaAssembleia
                setViewAtaAssembleia(null)
                openAttachModal(a)
              }}
            >
              <Paperclip className="h-3.5 w-3.5 mr-1" />
              <span>Gerenciar Anexos</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setViewAtaAssembleia(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Anexar / Atualizar Ata e Arquivos */}
      <Dialog open={!!attachAtaAssembleia} onOpenChange={(open) => !open && setAttachAtaAssembleia(null)}>
        <DialogContent className="max-w-lg bg-white rounded-2xl">
          <form onSubmit={handleSaveAtaModal}>
            <DialogHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-primary-600">
                <Paperclip className="h-5 w-5" />
                <DialogTitle className="text-base font-bold text-slate-900">
                  {attachAtaAssembleia?.ata?.arquivo_path ? "Gerenciar / Trocar Ata da Assembleia" : "Anexar Ata da Assembleia"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                {attachAtaAssembleia?.titulo} ({attachAtaAssembleia && formatDate(attachAtaAssembleia.data)})
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* File upload dropzone */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold text-xs">Arquivo Digitalizado (PDF, DOCX, Imagem)</Label>
                {!modalFile ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDragging(true)
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDragging(false)
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setModalFile(e.dataTransfer.files[0])
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-primary-500 bg-primary-50/50"
                        : "border-slate-200 hover:border-primary-400 hover:bg-slate-50/80"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setModalFile(e.target.files[0])
                        }
                      }}
                    />
                    <UploadCloud className="h-6 w-6 text-primary-600 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-800">
                      Clique para escolher ou arraste o arquivo aqui
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {attachAtaAssembleia?.ata?.arquivo_path
                        ? "O novo arquivo selecionado substituirá o anexo atual."
                        : "PDF, Word ou Imagens até 20MB"}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/60">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {modalFile.name}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setModalFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }}
                      className="h-7 w-7 text-slate-400 hover:text-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Texto / Resumo da Ata */}
              <div className="space-y-2">
                <Label htmlFor="modal_conteudo" className="text-slate-700 font-semibold text-xs">
                  Texto / Resumo Deliberativo da Ata <span className="text-slate-400 font-normal">(Opcional)</span>
                </Label>
                <textarea
                  id="modal_conteudo"
                  rows={4}
                  placeholder="Insira as principais decisões tomadas, aprovações de contas ou resumo oficial da reunião..."
                  className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-transparent transition-all"
                  value={modalConteudo}
                  onChange={(e) => setModalConteudo(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAttachAtaAssembleia(null)}
                disabled={modalLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={modalLoading} className="gap-1.5 shadow-2xs">
                {modalLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Salvar Ata e Anexo</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Editar Assembleia & Pautas */}
      <Dialog open={!!editAssembleia} onOpenChange={(open) => !open && setEditAssembleia(null)}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveEditModal}>
            <DialogHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-primary-600">
                <Edit3 className="h-5 w-5" />
                <DialogTitle className="text-base font-bold text-slate-900">
                  Editar Assembleia e Pautas
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Atualize informações gerais, horários, local e pautas da reunião
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* Título */}
              <div className="space-y-1.5">
                <Label htmlFor="edit_titulo" className="text-xs font-semibold text-slate-700">
                  Título da Assembleia <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit_titulo"
                  required
                  value={editForm.titulo}
                  onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })}
                  className="text-xs bg-white"
                />
              </div>

              {/* Data e Horários */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_data" className="text-xs font-semibold text-slate-700">
                    Data <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit_data"
                    required
                    type="date"
                    value={editForm.data}
                    onChange={(e) => setEditForm({ ...editForm, data: e.target.value })}
                    className="text-xs bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_hora_inicio" className="text-xs font-semibold text-slate-700">
                    Horário Início
                  </Label>
                  <Input
                    id="edit_hora_inicio"
                    type="time"
                    value={editForm.hora_inicio}
                    onChange={(e) => setEditForm({ ...editForm, hora_inicio: e.target.value })}
                    className="text-xs bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_hora_fim" className="text-xs font-semibold text-slate-700">
                    Horário Término
                  </Label>
                  <Input
                    id="edit_hora_fim"
                    type="time"
                    value={editForm.hora_fim}
                    onChange={(e) => setEditForm({ ...editForm, hora_fim: e.target.value })}
                    className="text-xs bg-white"
                  />
                </div>
              </div>

              {/* Local */}
              <div className="space-y-1.5">
                <Label htmlFor="edit_local" className="text-xs font-semibold text-slate-700">
                  Local da Realização
                </Label>
                <Input
                  id="edit_local"
                  placeholder="Ex: Salão de Festas / Online"
                  value={editForm.local}
                  onChange={(e) => setEditForm({ ...editForm, local: e.target.value })}
                  className="text-xs bg-white"
                />
              </div>

              {/* Descrição / Convocação */}
              <div className="space-y-1.5">
                <Label htmlFor="edit_descricao" className="text-xs font-semibold text-slate-700">
                  Convocação & Descrição Geral
                </Label>
                <textarea
                  id="edit_descricao"
                  rows={3}
                  value={editForm.descricao}
                  onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                  className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                />
              </div>

              {/* Pautas Dinâmicas */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800">
                    Pautas da Assembleia ({editPautas.length})
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-primary-600 gap-1"
                    onClick={() => setEditPautas((prev) => [...prev, { ordem: prev.length + 1, descricao: "" }])}
                  >
                    <Plus className="h-3 w-3" />
                    <span>Adicionar Pauta</span>
                  </Button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editPautas.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="flex items-center justify-center h-7 w-7 rounded bg-slate-100 text-slate-600 text-xs font-bold shrink-0">
                        {idx + 1}º
                      </span>
                      <Input
                        value={p.descricao}
                        onChange={(e) => {
                          const copy = [...editPautas]
                          copy[idx].descricao = e.target.value
                          setEditPautas(copy)
                        }}
                        placeholder={`Tema da pauta ${idx + 1}...`}
                        className="text-xs bg-white flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-red-600"
                        onClick={() => {
                          if (editPautas.length <= 1) {
                            setEditPautas([{ ordem: 1, descricao: "" }])
                            return
                          }
                          setEditPautas(editPautas.filter((_, i) => i !== idx).map((item, i) => ({ ...item, ordem: i + 1 })))
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditAssembleia(null)}
                disabled={editLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={editLoading} className="gap-1.5 shadow-2xs">
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
    </div>
  )
}
