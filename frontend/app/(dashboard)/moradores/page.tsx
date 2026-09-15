"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useMoradores, useDeleteMorador } from "@/services/moradores.service"
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
import { Plus, Search, Pencil, Trash2, Home, Mail, Phone, Users } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { ReadOnlyNotice } from "@/components/auth/admin-gate"

const tipoLabel: Record<string, string> = {
  proprietario: "Proprietário",
  inquilino: "Inquilino",
  morador: "Morador",
  dependente: "Dependente",
}

const getTipoBadgeStyle = (tipo: string) => {
  switch (tipo) {
    case "proprietario":
      return "bg-primary-50 text-primary-700 border-primary-200"
    case "inquilino":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "morador":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "dependente":
      return "bg-purple-50 text-purple-700 border-purple-200"
    default:
      return "bg-slate-50 text-slate-700 border-slate-200"
  }
}

export default function MoradoresPage() {
  const { isAdmin } = useAuth()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [tipoFilter, setTipoFilter] = useState("")

  const toApi = (v: string) => (v === "" || v === "all" ? undefined : v)
  const { data, isLoading } = useMoradores({
    page,
    page_size: 20,
    search: search || undefined,
    tipo: toApi(tipoFilter),
  })
  const deleteMut = useDeleteMorador()

  const formattedItems = useMemo(() => {
    return (data?.items || []).map((m) => ({
      ...m,
      apartamentos_str: (m.apartamentos || []).map((a) => a.numero).join(", "),
    }))
  }, [data?.items])

  const { items: sortedMoradores, sortField, sortDirection, requestSort } = useSortableData(
    formattedItems,
    "nome",
    "asc"
  )

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cadastro?")) return
    try {
      await deleteMut.mutateAsync(id)
      toast.success("Cadastro excluído com sucesso")
    } catch {
      toast.error("Erro ao excluir cadastro")
    }
  }

  return (
    <div className="space-y-6">
      <ReadOnlyNotice />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Moradores e Contatos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie os residentes, proprietários, inquilinos e seus vínculos com os apartamentos
          </p>
        </div>
        {isAdmin && (
          <Link href="/moradores/novo">
            <Button className="gap-2 shadow-xs">
              <Plus className="h-4 w-4" />
              <span>Novo Morador</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome, CPF ou email..."
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
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Tipo de cadastro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="proprietario">Proprietário</SelectItem>
            <SelectItem value="inquilino">Inquilino</SelectItem>
            <SelectItem value="morador">Morador</SelectItem>
            <SelectItem value="dependente">Dependente</SelectItem>
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
          <div className="rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                    <SortableHeader field="nome" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      Nome / Contato
                    </SortableHeader>
                    <SortableHeader field="cpf" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      CPF
                    </SortableHeader>
                    <SortableHeader field="tipo" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      Perfil
                    </SortableHeader>
                    <SortableHeader field="apartamentos_str" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      Unidades Vinculadas
                    </SortableHeader>
                    <SortableHeader field="telefone" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      Telefone
                    </SortableHeader>
                    <th className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedMoradores.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{m.nome}</div>
                        {m.email && (
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span>{m.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-mono text-xs">{m.cpf || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getTipoBadgeStyle(m.tipo)}`}>
                          {tipoLabel[m.tipo] || m.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {m.apartamentos && m.apartamentos.length > 0 ? (
                            m.apartamentos.map((ap) => (
                              <span
                                key={ap.apartamento_id}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700"
                                title={
                                  ap.tipo_vinculo === "proprietario"
                                    ? "Proprietário desta unidade"
                                    : "Residente / Inquilino desta unidade"
                                }
                              >
                                <Home className="h-3 w-3 text-slate-400" />
                                <span>Apto {ap.numero}{ap.bloco ? ` - ${ap.bloco}` : ""}</span>
                                {ap.tipo_vinculo === "proprietario" && (
                                  <span className="text-[10px] text-primary-600 font-bold">• Prop</span>
                                )}
                                {ap.is_responsavel && (
                                  <span className="text-[10px] text-emerald-600 font-bold">• Resp</span>
                                )}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs italic">Sem vínculo</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs">
                        {m.telefone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{m.telefone}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isAdmin ? (
                            <>
                              <Link href={`/moradores/${m.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500 hover:text-slate-900"
                                  title="Editar morador"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(m.id)}
                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                title="Excluir cadastro"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Link href={`/moradores/${m.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-primary-600 hover:bg-primary-50"
                                title="Ver detalhes do cadastro"
                              >
                                Detalhes
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!data?.items || data.items.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                        Nenhum morador ou proprietário encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Mostrando {data.items.length} de {data.total} cadastros
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
