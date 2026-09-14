"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useApartamentos, useUpdateApartamento, useDeleteApartamento } from "@/services/apartamentos.service"
import { useMoradores } from "@/services/moradores.service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SortableHeader } from "@/components/ui/sortable-header"
import { useSortableData } from "@/hooks/use-sortable-data"
import { Plus, Search, Pencil, Trash2, Building2, UserCheck, Shield } from "lucide-react"
import { toast } from "sonner"
import type { Apartamento } from "@/types/apartamento"

const tipoLabel: Record<string, string> = {
  padrao: "Padrão",
  area_privativa: "Área Privativa",
  cobertura: "Cobertura",
}

const statusLabel: Record<string, string> = {
  ocupado: "Ocupado",
  vazio: "Vazio (Livre)",
  alugado: "Alugado",
}

export default function ApartamentosPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [tipoFilter, setTipoFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const toApi = (v: string) => (v === "" || v === "all" ? undefined : v)

  const { data, isLoading, refetch } = useApartamentos({
    page,
    page_size: 20,
    search: search || undefined,
    tipo: toApi(tipoFilter),
    status: toApi(statusFilter),
  })
  const { data: moradoresData } = useMoradores({ page_size: 200 })
  const updateMut = useUpdateApartamento()
  const deleteMut = useDeleteApartamento()

  const moradorMap = useMemo(() => {
    const map: Record<string, string> = {}
    moradoresData?.items?.forEach((m) => {
      map[m.id] = m.nome
    })
    return map
  }, [moradoresData])

  const formattedItems = useMemo(() => {
    return (data?.items || []).map((apto) => ({
      ...apto,
      proprietario_nome: apto.proprietario_id
        ? moradorMap[apto.proprietario_id] || apto.proprietario?.nome || ""
        : "",
      responsavel_nome: apto.responsavel_id
        ? moradorMap[apto.responsavel_id] || apto.responsavel?.nome || ""
        : "",
    }))
  }, [data?.items, moradorMap])

  const { items: sortedApartamentos, sortField, sortDirection, requestSort } = useSortableData(
    formattedItems,
    "numero",
    "asc"
  )

  const handleToggleStatus = async (apto: Apartamento) => {
    const nextStatus = apto.status === "ocupado" ? "vazio" : "ocupado"
    try {
      await updateMut.mutateAsync({
        id: apto.id,
        data: { status: nextStatus },
      })
      await refetch()
      toast.success(
        `Apartamento ${apto.numero} alterado para ${nextStatus === "vazio" ? "Vazio" : "Ocupado"}!`
      )
    } catch {
      toast.error("Erro ao alterar status do apartamento")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir apartamento?")) return
    try {
      await deleteMut.mutateAsync(id)
      toast.success("Apartamento excluído")
    } catch {
      toast.error("Erro ao excluir")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Apartamentos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie as unidades autônomas, proprietários e responsáveis administrativos
          </p>
        </div>
        <Link href="/apartamentos/novo">
          <Button className="gap-2 shadow-xs">
            <Plus className="h-4 w-4" />
            <span>Novo Apartamento</span>
          </Button>
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por número, bloco ou morador..."
            className="pl-9 bg-white"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={tipoFilter}
          onValueChange={(v) => {
            setTipoFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[160px] bg-white">
            <SelectValue placeholder="Tipo de unidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="padrao">Padrão</SelectItem>
            <SelectItem value="area_privativa">Área Privativa</SelectItem>
            <SelectItem value="cobertura">Cobertura</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[150px] bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ocupado">Ocupado</SelectItem>
            <SelectItem value="vazio">Vazio (Livre)</SelectItem>
            <SelectItem value="alugado">Alugado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                    <SortableHeader field="numero" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      Número
                    </SortableHeader>
                    <SortableHeader field="bloco" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      Bloco
                    </SortableHeader>
                    <SortableHeader field="tipo" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      Tipo
                    </SortableHeader>
                    <SortableHeader field="proprietario_nome" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      Proprietário
                    </SortableHeader>
                    <SortableHeader field="responsavel_nome" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      Resp. Financeiro
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
                  {sortedApartamentos.map((apto) => (
                    <tr key={apto.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <span>{apto.numero}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{apto.bloco || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-600">{tipoLabel[apto.tipo] || apto.tipo}</td>
                      <td className="px-4 py-3.5 text-slate-700">
                        {apto.proprietario_nome || <span className="text-slate-400 italic text-xs">Não vinculado</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {apto.responsavel_nome ? (
                          <div className="inline-flex items-center gap-1.5 font-medium text-slate-800 text-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span>{apto.responsavel_nome}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Não definido</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(apto)}
                          disabled={updateMut.isPending}
                          title={`Alternar status do apto ${apto.numero}`}
                          className="focus:outline-none cursor-pointer"
                        >
                          <span
                            className={`status-pill ${
                              apto.status === "ocupado"
                                ? "status-pill-ocupado"
                                : apto.status === "alugado"
                                ? "status-pill-alugado"
                                : "status-pill-vago"
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            <span>{statusLabel[apto.status] || apto.status}</span>
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end items-center gap-1">
                          <Link href={`/apartamentos/${apto.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-slate-900"
                              title="Editar unidade"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(apto.id)}
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="Excluir unidade"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-sm text-slate-400">
                        Nenhum apartamento encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Mostrando {data.items.length} de {data.total} unidades
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
