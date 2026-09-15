"use client"

import { useState } from "react"
import api from "@/lib/api"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SortableHeader } from "@/components/ui/sortable-header"
import { useSortableData } from "@/hooks/use-sortable-data"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate } from "@/lib/utils"
import { Upload, Download, Trash2, Files, Loader2, FileText } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { ReadOnlyNotice } from "@/components/auth/admin-gate"

const categoriaLabel: Record<string, string> = {
  atas: "Atas",
  boletos: "Boletos",
  comprovantes: "Comprovantes",
  contratos: "Contratos",
  convencao: "Convenção",
  outros: "Outros",
}

export default function DocumentosPage() {
  const { isAdmin } = useAuth()
  const [page, setPage] = useState(1)
  const [categoria, setCategoria] = useState("all")
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const qc = useQueryClient()

  const catFilter = categoria === "all" ? undefined : categoria

  const { data, isLoading } = useQuery({
    queryKey: ["documentos", page, catFilter],
    queryFn: () =>
      api
        .get(`/documentos`, {
          params: { page, page_size: 15, categoria: catFilter },
        })
        .then((r) => r.data),
  })

  const { items: sortedItems, sortField, sortDirection, requestSort } = useSortableData(
    data?.items || [],
    "created_at",
    "desc"
  )

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)
    formData.append("nome", file.name)
    formData.append("categoria", categoria === "all" ? "outros" : categoria)

    try {
      await api.post("/documentos", formData)
      qc.invalidateQueries({ queryKey: ["documentos"] })
      toast.success("Documento enviado com sucesso!")
    } catch {
      toast.error("Erro ao enviar documento.")
    } finally {
      e.target.value = "";
    }
  }

  const handleDownload = async (id: string, nome: string) => {
    try {
      setDownloadingId(id)
      const res = await api.get(`/documentos/${id}/download`, {
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", nome)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error("Erro ao baixar documento.")
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return
    try {
      await api.delete(`/documentos/${id}`)
      qc.invalidateQueries({ queryKey: ["documentos"] })
      toast.success("Documento excluído com sucesso!")
    } catch {
      toast.error("Erro ao excluir documento.")
    }
  }

  return (
    <div className="space-y-6">
      <ReadOnlyNotice />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Documentos e Arquivos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestão digital de atas, contratos, convenções e comprovantes do condomínio
          </p>
        </div>

        {isAdmin && (
          <label>
            <Button asChild className="cursor-pointer gap-2 shadow-xs">
              <span>
                <Upload className="h-4 w-4" /> Enviar Documento
              </span>
            </Button>
            <input type="file" className="hidden" onChange={handleUpload} />
          </label>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center gap-3">
        <Select
          value={categoria}
          onValueChange={(v) => {
            setCategoria(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[200px] bg-white">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            <SelectItem value="atas">Atas</SelectItem>
            <SelectItem value="boletos">Boletos</SelectItem>
            <SelectItem value="comprovantes">Comprovantes</SelectItem>
            <SelectItem value="contratos">Contratos</SelectItem>
            <SelectItem value="convencao">Convenção</SelectItem>
            <SelectItem value="outros">Outros</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Table */}
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
                  <SortableHeader field="nome" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                    Nome do Arquivo
                  </SortableHeader>
                  <SortableHeader field="categoria" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                    Categoria
                  </SortableHeader>
                  <SortableHeader field="tamanho_bytes" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                    Tamanho
                  </SortableHeader>
                  <SortableHeader field="created_at" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                    Data de Envio
                  </SortableHeader>
                  <th className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedItems.map((d: any) => {
                  const tamanhoKb = d.tamanho_bytes ? `${(d.tamanho_bytes / 1024).toFixed(1)} KB` : "—"
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary-600 shrink-0" />
                          <span>{d.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {categoriaLabel[d.categoria] || d.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs font-mono">{tamanhoKb}</td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs">{formatDate(d.created_at)}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={downloadingId === d.id}
                            onClick={() => handleDownload(d.id, d.nome)}
                            title="Baixar arquivo"
                            className="h-8 w-8 text-primary-600 hover:bg-primary-50"
                          >
                            {downloadingId === d.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(d.id)}
                              title="Excluir arquivo"
                              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {sortedItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-slate-400">
                      Nenhum documento cadastrado nesta categoria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Mostrando {data.items.length} de {data.total} documentos
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
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
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
