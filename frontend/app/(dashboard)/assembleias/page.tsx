"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import api from "@/lib/api"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useSortableData } from "@/hooks/use-sortable-data"
import { formatDate } from "@/lib/utils"
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
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
} from "lucide-react"
import { toast } from "sonner"

export default function AssembleiasPage() {
  const [page, setPage] = useState(1)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [viewAtaAssembleia, setViewAtaAssembleia] = useState<any | null>(null)
  const [attachAtaAssembleia, setAttachAtaAssembleia] = useState<any | null>(null)
  const [expandedPautas, setExpandedPautas] = useState<Record<string, boolean>>({})

  // Form states for modal
  const [modalFile, setModalFile] = useState<File | null>(null)
  const [modalConteudo, setModalConteudo] = useState("")
  const [modalLoading, setModalLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["assembleias", page],
    queryFn: () => api.get(`/assembleias?page=${page}&page_size=20`).then((r) => r.data),
  })

  const { items: sortedAssembleias, sortField, sortDirection, requestSort } = useSortableData(
    data?.items || [],
    "data",
    "desc"
  )

  const togglePautas = (id: string) => {
    setExpandedPautas((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta assembleia e todos os registros associados?")) return
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
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement("a")
      link.href = url
      const ext = assembleia.ata?.arquivo_path?.split(".").pop() || "pdf"
      const safeTitle = (assembleia.titulo || "ata").replace(/[^a-zA-Z0-9_-]/g, "_")
      link.setAttribute("download", `Ata_${assembleia.data}_${safeTitle}.${ext}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success("Download da ata concluído!")
    } catch {
      toast.error("Erro ao baixar o arquivo da ata.")
    } finally {
      setDownloadingId(null)
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
      toast.success("Ata salva com sucesso!")
      setAttachAtaAssembleia(null)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Erro ao atualizar ata da assembleia."
      toast.error(msg)
    } finally {
      setModalLoading(false)
    }
  }

  const getFileName = (path?: string) => {
    if (!path) return "Documento Anexo"
    const name = path.split("/").pop() || path
    return name
  }

  const isPastDate = (dateStr: string) => {
    const today = new Date().toISOString().split("T")[0]
    return dateStr <= today
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Assembleias e Reuniões
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pautas de discussão, convocações, arquivos de atas digitalizadas e decisões coletivas
          </p>
        </div>
        <Link href="/assembleias/nova">
          <Button className="gap-2 shadow-xs">
            <Plus className="h-4 w-4" />
            <span>Nova Assembleia</span>
          </Button>
        </Link>
      </div>

      {/* Toolbar / Sort */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="font-semibold uppercase tracking-wider">Ordenar por:</span>
        <Button
          variant={sortField === "data" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 text-xs font-medium"
          onClick={() => requestSort("data")}
        >
          <span>Data</span>
          {sortField === "data" &&
            (sortDirection === "asc" ? (
              <ArrowUp className="ml-1 h-3 w-3 text-primary-600" />
            ) : (
              <ArrowDown className="ml-1 h-3 w-3 text-primary-600" />
            ))}
        </Button>
        <Button
          variant={sortField === "titulo" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 text-xs font-medium"
          onClick={() => requestSort("titulo")}
        >
          <span>Título</span>
          {sortField === "titulo" &&
            (sortDirection === "asc" ? (
              <ArrowUp className="ml-1 h-3 w-3 text-primary-600" />
            ) : (
              <ArrowDown className="ml-1 h-3 w-3 text-primary-600" />
            ))}
        </Button>
        <Button
          variant={sortField === "local" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 text-xs font-medium"
          onClick={() => requestSort("local")}
        >
          <span>Local</span>
          {sortField === "local" &&
            (sortDirection === "asc" ? (
              <ArrowUp className="ml-1 h-3 w-3 text-primary-600" />
            ) : (
              <ArrowDown className="ml-1 h-3 w-3 text-primary-600" />
            ))}
        </Button>
      </div>

      {/* Assembleias List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedAssembleias.map((a: any) => {
            const hasAtaFile = Boolean(a.ata?.arquivo_path)
            const hasAtaText = Boolean(a.ata?.conteudo && a.ata.conteudo.trim().length > 0)
            const hasPautas = a.pautas && a.pautas.length > 0
            const isPautasExpanded = expandedPautas[a.id]
            const past = isPastDate(a.data)

            return (
              <Card
                key={a.id}
                className="border border-slate-200/90 bg-white shadow-card hover:border-slate-300 transition-all overflow-hidden rounded-2xl"
              >
                <CardHeader className="pb-3 bg-slate-50/40 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                          past
                            ? "bg-slate-100 text-slate-600"
                            : "bg-primary-100 text-primary-700 font-semibold"
                        }`}
                      >
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-base font-bold text-slate-900 leading-snug">
                            {a.titulo}
                          </CardTitle>
                          <span
                            className={`px-2 py-0.5 text-[11px] font-semibold rounded-full uppercase tracking-wider ${
                              past
                                ? "bg-slate-100 text-slate-600 border border-slate-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {past ? "Realizada" : "Agendada / Convocada"}
                          </span>
                        </div>

                        {/* Metadados: Data, Horário e Local */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2 font-medium">
                          <span className="flex items-center gap-1.5 bg-white text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                            <CalendarDays className="h-3.5 w-3.5 text-primary-500" />
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
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-start">
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
                  {/* Descrição / Convocação */}
                  {a.descricao && (
                    <div className="text-sm text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Convocação / Descrição Geral
                      </p>
                      <p>{a.descricao}</p>
                    </div>
                  )}

                  {/* Pautas da Reunião */}
                  {hasPautas && (
                    <div className="rounded-xl border border-slate-200/70 bg-white overflow-hidden">
                      <button
                        type="button"
                        onClick={() => togglePautas(a.id)}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-primary-600" />
                          <span>Pautas da Assembleia ({a.pautas.length})</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 text-xs font-normal">
                          <span>{isPautasExpanded ? "Ocultar" : "Ver pautas"}</span>
                          {isPautasExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </div>
                      </button>

                      {isPautasExpanded && (
                        <div className="px-3.5 pb-3 pt-1 space-y-2 border-t border-slate-100 bg-slate-50/30">
                          {a.pautas.map((p: any) => (
                            <div key={p.id} className="flex items-start gap-2.5 text-xs text-slate-700">
                              <span className="flex items-center justify-center h-5 w-5 rounded bg-primary-50 text-primary-700 font-bold text-[10px] shrink-0 mt-0.5">
                                {p.ordem}
                              </span>
                              <span className="leading-relaxed">{p.descricao}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ata e Anexos Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                        <span>Ata e Documentos Anexos</span>
                      </span>
                    </div>

                    {hasAtaFile || hasAtaText ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Arquivo Anexo Card */}
                        {hasAtaFile && (
                          <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                                <FileCheck className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-900 truncate">
                                  {getFileName(a.ata?.arquivo_path)}
                                </p>
                                <p className="text-[11px] text-emerald-700 font-medium">
                                  Documento Oficial Anexado
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs text-emerald-700 border-emerald-300 bg-white hover:bg-emerald-100 shrink-0 ml-2"
                              onClick={() => handleDownloadAta(a)}
                              disabled={downloadingId === a.id}
                              title="Baixar ata da assembleia"
                            >
                              {downloadingId === a.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5 text-emerald-600" />
                              )}
                              <span>Baixar</span>
                            </Button>
                          </div>
                        )}

                        {/* Texto / Resumo Card */}
                        {hasAtaText && (
                          <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50/70 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-900 truncate">
                                  {a.ata?.conteudo.slice(0, 45)}...
                                </p>
                                <p className="text-[11px] text-blue-700 font-medium">
                                  Resumo / Texto Registrado
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs text-blue-700 border-blue-300 bg-white hover:bg-blue-100 shrink-0 ml-2"
                              onClick={() => setViewAtaAssembleia(a)}
                              title="Visualizar texto da ata"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-600" />
                              <span>Ver</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                          <span>Nenhuma ata ou documento foi anexado para esta assembleia ainda.</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-primary-600 hover:bg-primary-50 font-semibold gap-1"
                          onClick={() => openAttachModal(a)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Anexar Agora</span>
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs text-slate-600 hover:bg-slate-100"
                      onClick={() => openAttachModal(a)}
                    >
                      <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                      <span>{hasAtaFile || hasAtaText ? "Gerenciar / Trocar Ata" : "Anexar Ata"}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {sortedAssembleias.length === 0 && (
            <div className="py-14 text-center text-sm text-slate-400 bg-white rounded-2xl border border-slate-200/80 shadow-card">
              <CalendarDays className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">Nenhuma assembleia registrada</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Clique no botão "Nova Assembleia" para cadastrar reuniões, pautas e atas.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal: Visualizar Resumo da Ata */}
      <Dialog open={!!viewAtaAssembleia} onOpenChange={(open) => !open && setViewAtaAssembleia(null)}>
        <DialogContent className="max-w-xl bg-white rounded-2xl">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-primary-600">
              <FileText className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-slate-900">
                Texto e Detalhes da Ata
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              {viewAtaAssembleia?.titulo} • Realizada em {viewAtaAssembleia && formatDate(viewAtaAssembleia.data)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Informações gerais */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
              <div>
                <span className="font-semibold text-slate-800">Data: </span>
                {viewAtaAssembleia && formatDate(viewAtaAssembleia.data)}
              </div>
              <div>
                <span className="font-semibold text-slate-800">Local: </span>
                {viewAtaAssembleia?.local || "Não informado"}
              </div>
            </div>

            {/* Texto da Ata */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Conteúdo / Resumo Registrado
              </Label>
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                {viewAtaAssembleia?.ata?.conteudo || "Nenhum texto registrado."}
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-3 border-t border-slate-100">
            {viewAtaAssembleia?.ata?.arquivo_path ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                onClick={() => handleDownloadAta(viewAtaAssembleia)}
              >
                <Download className="h-3.5 w-3.5" />
                <span>Baixar Documento Completo</span>
              </Button>
            ) : <div />}
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

      {/* Modal: Anexar / Atualizar Ata */}
      <Dialog open={!!attachAtaAssembleia} onOpenChange={(open) => !open && setAttachAtaAssembleia(null)}>
        <DialogContent className="max-w-lg bg-white rounded-2xl">
          <form onSubmit={handleSaveAtaModal}>
            <DialogHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-primary-600">
                <Paperclip className="h-5 w-5" />
                <DialogTitle className="text-base font-bold text-slate-900">
                  {attachAtaAssembleia?.ata?.arquivo_path ? "Atualizar Ata e Anexos" : "Anexar Ata da Assembleia"}
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
                        ? "O novo arquivo substituirá o documento atual."
                        : "PDF, Word ou Imagem até 20MB"}
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
                  Texto / Resumo da Ata <span className="text-slate-400 font-normal">(Opcional)</span>
                </Label>
                <textarea
                  id="modal_conteudo"
                  rows={4}
                  placeholder="Insira as deliberações, decisões tomadas ou resumo da ata..."
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
                    <span>Salvar Ata</span>
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
