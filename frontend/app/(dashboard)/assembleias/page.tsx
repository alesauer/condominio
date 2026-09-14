"use client"

import { useState } from "react"
import Link from "next/link"
import api from "@/lib/api"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSortableData } from "@/hooks/use-sortable-data"
import { formatDate } from "@/lib/utils"
import { Plus, Trash2, ArrowUp, ArrowDown, CalendarDays, MapPin } from "lucide-react"
import { toast } from "sonner"

export default function AssembleiasPage() {
  const [page, setPage] = useState(1)
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["assembleias", page],
    queryFn: () => api.get(`/assembleias?page=${page}&page_size=10`).then((r) => r.data),
  })

  const { items: sortedAssembleias, sortField, sortDirection, requestSort } = useSortableData(
    data?.items || [],
    "data",
    "desc"
  )

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta assembleia?")) return
    try {
      await api.delete(`/assembleias/${id}`)
      qc.invalidateQueries({ queryKey: ["assembleias"] })
      toast.success("Assembleia excluída com sucesso!")
    } catch {
      toast.error("Erro ao excluir assembleia")
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
            Pautas, convocações, atas e decisões coletivas do condomínio
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
          {sortField === "data" && (
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
          variant={sortField === "local" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 text-xs font-medium"
          onClick={() => requestSort("local")}
        >
          <span>Local</span>
          {sortField === "local" && (
            sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3 text-primary-600" /> : <ArrowDown className="ml-1 h-3 w-3 text-primary-600" />
          )}
        </Button>
      </div>

      {/* Assembleias List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAssembleias.map((a: any) => (
            <Card key={a.id} className="border border-slate-200 bg-white shadow-card hover:border-slate-300 transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base font-semibold text-slate-900">
                      {a.titulo}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-medium bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                      {formatDate(a.data)}
                    </span>
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
              <CardContent className="pt-1">
                <p className="text-sm text-slate-600 leading-relaxed pl-10">
                  {a.descricao || "Sem descrição informada."}
                </p>
                {a.local && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2 pl-10 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>Local: {a.local}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {sortedAssembleias.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-400 bg-white rounded-xl border border-slate-200 shadow-card">
              Nenhuma assembleia registrada.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
