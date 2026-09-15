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
    queryFn: () => api.get(`/assembleias?page=${page}&page_size=15`).then((r) => r.data),
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
      toast.error("Erro ao excluir assembleia")
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
      toast.success("Ata atualizada com sucesso!")
      setAttachAtaAssembleia(null)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Erro ao atualizar ata da assembleia."
      toast.error(msg)
    } finally {
      setModalLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Assembleias e Reuniões
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pautas, convocações, atas digitalizadas e arquivos de decisões coletivas
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
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedAssembleias.map((a: any) => {
            const hasAtaFile = Boolean(a.ata?.arquivo_path)
            const hasAtaText = Boolean(a.ata?.conteudo && a.ata.conteudo.trim().length > 0)
            const hasPautas = a.pautas && a.pautas.length > 0
            const isPautasExpanded = expandedPautas[a.id]

            return (
              <Card
                key={a.id}
                className="border border-slate-200/80 bg-white shadow-card hover:border-slate-300 transition-all"
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-primary-50 text-primary-600 shrink-0 mt-0.5">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold text-slate-900 leading-snug">
                          {a.titulo}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 mt-1.5 font-medium">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md border border-slate-200">
                            {formatDate(a.data)}
                          </span>
                          {(a.hora_inicio || a.hora_fim) && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {a.hora_inicio && a.hora_fim
                                ? `${a.hora_inicio.slice(0, 5)} às ${a.hora_fim.slice(0, 5)}`
                                : a.hora_inicio
                                ? `A partir das ${a.hora_inicio.slice(0, 5)}`
                                : `Até ${a.hora_fim.slice(0, 5)}`}
                            </span>
                          )}
                          {a.local && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              {a.local}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-start">
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

                <CardContent className="pt-0 space-y-3.5">
                  {/* Descrição */}
                  {a.descricao && (
                    <p className="text-sm text-slate-600 leading-relaxed pl-1">
                      {a.descricao}
                    </p>
                  )}

                  {/* Pautas Toggle */}
                  {hasPautas && (
                    <div className="rounded-lg border border-slate-100 bg-slate-50/60 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => togglePautas(a.id)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100/80 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-slate-500" />
                          <span>Pautas da Reunião ({a.pautas.length})</span>
                        </div>
                        {isPautasExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </button>

                      {isPautasExpanded && (
                        <div className="px-3 pb-3 pt-1 space-y-1.5 border-t border-slate-100">
                          {a.pautas.map((p: any) => (
                            <div key={p.id} className="flex items-start gap-2 text-xs text-slate-600">
                              <span className="font-semibold text-slate-400 shrink-0">
                                {p.ordem}º
                              </span>
                              <span>{p.descricao}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ata Status and Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      {hasAtaFile ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Ata Anexada</span>
                        </span>
                      ) : hasAtaText ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/80">
                          <FileText className="h-3.5 w-3.5 text-blue-600" />
                          <span>Texto Registrado</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200">
                          <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                          <span>Sem ata anexada</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {hasAtaFile && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 shadow-2xs"
                          onClick={() => handleDownloadAta(a)}
                          disabled={downloadingId === a.id}
                        >
                          {downloadingId === a.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5 text-emerald-600" />
                          )}
                          <span>Baixar Ata</span>
                        </Button>
                      )}

                      {hasAtaText && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs"
                          onClick={() => setViewAtaAssembleia(a)}
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          <span>Ver Resumo</span>
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-primary-600 hover:bg-primary-50"
                        onClick={() => openAttachModal(a)}
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        <span>{hasAtaFile || hasAtaText ? "Atualizar Ata" : "Anexar Ata"}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {sortedAssembleias.length === 0 && (
            <div className="py-14 text-center text-sm text-slate-400 bg-white rounded-xl border border-slate-200/80 shadow-card">
              <CalendarDays className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">Nenhuma assembleia registrada</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Clique no botão "Nova Assembleia" para cadastrar reuniões e pautas.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal: Visualizar Resumo da Ata */}
      <Dialog open={!!viewAtaAssembleia} onOpenChange={(open) => !open && setViewAtaAssembleia(null)}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary-600">
              <FileText className="h-5 w-5" />
              <DialogTitle className="text-base font-semibold text-slate-900">
                Texto / Resumo da Ata
              </DialogTitle>
            </div>
            <DialogDescription>
              {viewAtaAssembleia?.titulo} • {viewAtaAssembleia && formatDate(viewAtaAssembleia.data)}
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
            {viewAtaAssembleia?.ata?.conteudo || "Nenhum texto registrado."}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            {viewAtaAssembleia?.ata?.arquivo_path ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                onClick={() => handleDownloadAta(viewAtaAssembleia)}
              >
                <Download className="h-3.5 w-3.5" />
                <span>Baixar Arquivo Completo</span>
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
        <DialogContent className="max-w-lg bg-white">
          <form onSubmit={handleSaveAtaModal}>
            <DialogHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-primary-600">
                <Paperclip className="h-5 w-5" />
                <DialogTitle className="text-base font-semibold text-slate-900">
                  {attachAtaAssembleia?.ata?.arquivo_path ? "Atualizar Ata e Anexos" : "Anexar Ata da Assembleia"}
                </DialogTitle>
              </div>
              <DialogDescription>
                {attachAtaAssembleia?.titulo} ({attachAtaAssembleia && formatDate(attachAtaAssembleia.data)})
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* File upload dropzone */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium text-xs">Arquivo Digitalizado (PDF, DOCX, Imagem)</Label>
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
                        ? "O novo arquivo substituirá o anexo atual."
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
                <Label htmlFor="modal_conteudo" className="text-slate-700 font-medium text-xs">
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

