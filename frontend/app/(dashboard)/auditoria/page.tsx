"use client"

import { useState } from "react"
import api from "@/lib/api"
import { useQuery } from "@tanstack/react-query"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/utils"
import { History, Eye, Filter, ShieldAlert } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

const getAcaoBadgeStyle = (acao: string) => {
  switch (acao) {
    case "CRIAR":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "ATUALIZAR":
      return "bg-primary-50 text-primary-700 border-primary-200"
    case "EXCLUIR":
      return "bg-rose-50 text-rose-700 border-rose-200"
    case "PAGAR":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    default:
      return "bg-slate-50 text-slate-700 border-slate-200"
  }
}



export default function AuditoriaPage() {
  const { isAdmin } = useAuth()
  const [page, setPage] = useState(1)
  const [entidade, setEntidade] = useState("all")
  const [selectedLog, setSelectedLog] = useState<any | null>(null)

  const entFilter = entidade === "all" ? undefined : entidade

  const { data, isLoading } = useQuery({
    queryKey: ["auditoria", page, entFilter],
    queryFn: () =>
      api
        .get("/auditoria", {
          params: { page, page_size: 15, entidade_tipo: entFilter },
        })
        .then((r) => r.data),
    enabled: isAdmin,
  })

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-slate-200 bg-white">
        <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Acesso Restrito ao Síndico</h2>
        <p className="text-sm text-slate-500 max-w-md mt-1">
          O registro de trilha de auditoria é confidencial e restrito à administração do condomínio.
        </p>
      </div>
    )
  }

  const { items: sortedItems, sortField, sortDirection, requestSort } = useSortableData(
    data?.items || [],
    "created_at",
    "desc"
  )

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Registro de Auditoria
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Trilha completa de ações, alterações e eventos com data e usuário responsável
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Select
          value={entidade}
          onValueChange={(v) => {
            setEntidade(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[220px] bg-white">
            <Filter className="mr-2 h-4 w-4 text-slate-400" />
            <SelectValue placeholder="Filtrar por Entidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Entidades</SelectItem>
            <SelectItem value="apartamentos">Apartamentos</SelectItem>
            <SelectItem value="proprietarios">Proprietários</SelectItem>
            <SelectItem value="moradores">Moradores</SelectItem>
            <SelectItem value="receitas">Receitas</SelectItem>
            <SelectItem value="despesas">Despesas</SelectItem>
            <SelectItem value="cobrancas">Cobranças</SelectItem>
            <SelectItem value="avisos">Avisos</SelectItem>
            <SelectItem value="assembleias">Assembleias</SelectItem>
            <SelectItem value="documentos">Documentos</SelectItem>
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
                  <SortableHeader field="created_at" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                    Data e Hora
                  </SortableHeader>
                  <SortableHeader field="usuario_nome" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                    Usuário
                  </SortableHeader>
                  <SortableHeader field="acao" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                    Ação
                  </SortableHeader>
                  <SortableHeader field="entidade_tipo" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                    Módulo / Entidade
                  </SortableHeader>
                  <th className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                    Detalhes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedItems.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-slate-600 font-mono text-xs">
                      {formatDate(a.created_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-900">{a.usuario_nome || "Sistema"}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${getAcaoBadgeStyle(a.acao)}`}>
                        {a.acao}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-500 uppercase">
                      {a.entidade_tipo}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(a)}
                        className="h-8 text-xs text-primary-600 hover:bg-primary-50 gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Ver Dados</span>
                      </Button>
                    </td>
                  </tr>
                ))}
                {sortedItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-slate-400">
                      Nenhum registro de auditoria encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Mostrando {data.items.length} de {data.total} registros
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

      {/* Modal de Detalhes do Log */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <History className="h-5 w-5 text-primary-600" />
              <span>Registro de Auditoria</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selectedLog && (
                <>
                  Ação <b>{selectedLog.acao}</b> em <b>{selectedLog.entidade_tipo}</b> executada por{" "}
                  <b>{selectedLog.usuario_nome || "Sistema"}</b> em {formatDate(selectedLog.created_at)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 py-2">
              {selectedLog.dados_anteriores && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Dados Anteriores
                  </div>
                  <pre className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs overflow-x-auto font-mono text-slate-700">
                    {JSON.stringify(selectedLog.dados_anteriores, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.dados_novos && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1">
                    Dados Novos / Parâmetros
                  </div>
                  <pre className="p-3 bg-primary-50/50 border border-primary-200 rounded-lg text-xs overflow-x-auto font-mono text-slate-900">
                    {JSON.stringify(selectedLog.dados_novos, null, 2)}
                  </pre>
                </div>
              )}

              {!selectedLog.dados_anteriores && !selectedLog.dados_novos && (
                <p className="text-xs text-slate-500">
                  Nenhum dado adicional associado a este registro.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
