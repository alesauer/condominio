"use client"

import { useState } from "react"
import Link from "next/link"
import api from "@/lib/api"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSortableData } from "@/hooks/use-sortable-data"
import { formatDate } from "@/lib/utils"
import { Plus, Trash2, ArrowUp, ArrowDown, Bell, AlertTriangle, Info, Calendar } from "lucide-react"
import { toast } from "sonner"

const getPrioridadeBadgeStyle = (prioridade: string) => {
  switch (prioridade) {
    case "urgente":
      return "bg-rose-50 text-rose-700 border-rose-200"
    case "alta":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "media":
      return "bg-primary-50 text-primary-700 border-primary-200"
    case "baixa":
    default:
      return "bg-slate-50 text-slate-700 border-slate-200"
  }
}

export default function AvisosPage() {
  const [page, setPage] = useState(1)
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["avisos", page],
    queryFn: () => api.get(`/avisos?page=${page}&page_size=10`).then((r) => r.data),
  })

  const { items: sortedAvisos, sortField, sortDirection, requestSort } = useSortableData(
    data?.items || [],
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
      toast.error("Erro ao excluir comunicado")
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Mural de Avisos e Comunicados
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Publicações, informativos gerais e comunicados oficiais aos moradores
          </p>
        </div>
        <Link href="/avisos/novo">
          <Button className="gap-2 shadow-xs">
            <Plus className="h-4 w-4" />
            <span>Novo Aviso</span>
          </Button>
        </Link>
      </div>

      {/* Toolbar / Sort */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="font-semibold uppercase tracking-wider">Ordenar por:</span>
        <Button
          variant={sortField === "data_publicacao" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 text-xs font-medium"
          onClick={() => requestSort("data_publicacao")}
        >
          <span>Data</span>
          {sortField === "data_publicacao" && (
            sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3 text-primary-600" /> : <ArrowDown className="ml-1 h-3 w-3 text-primary-600" />
          )}
        </Button>
        <Button
          variant={sortField === "titulo" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 text-xs font-medium"
          onClick={() => requestSort("titulo")}
        >
          <span>Título</span>
          {sortField === "titulo" && (
            sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3 text-primary-600" /> : <ArrowDown className="ml-1 h-3 w-3 text-primary-600" />
          )}
        </Button>
        <Button
          variant={sortField === "prioridade" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 text-xs font-medium"
          onClick={() => requestSort("prioridade")}
        >
          <span>Prioridade</span>
          {sortField === "prioridade" && (
            sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3 text-primary-600" /> : <ArrowDown className="ml-1 h-3 w-3 text-primary-600" />
          )}
        </Button>
      </div>

      {/* Avisos List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAvisos.map((a: any) => (
            <Card key={a.id} className="border border-slate-200 bg-white shadow-card hover:border-slate-300 transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
                      <Bell className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base font-semibold text-slate-900">
                      {a.titulo}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase ${getPrioridadeBadgeStyle(a.prioridade)}`}>
                      {a.prioridade}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {formatDate(a.data_publicacao)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(a.id)}
                      title="Excluir comunicado"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-1">
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap pl-10">
                  {a.descricao}
                </p>
              </CardContent>
            </Card>
          ))}
          {sortedAvisos.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-400 bg-white rounded-xl border border-slate-200 shadow-card">
              Nenhum aviso ou comunicado encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
