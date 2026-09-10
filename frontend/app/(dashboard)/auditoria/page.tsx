"use client";

import { useState } from "react";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useSortableData } from "@/hooks/use-sortable-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { History, Eye, Filter } from "lucide-react";

const actionColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  CRIAR: "default",
  ATUALIZAR: "secondary",
  EXCLUIR: "destructive",
  PAGAR: "default",
  GERAR_COBRANCAS_LOTE: "secondary",
};

export default function AuditoriaPage() {
  const [page, setPage] = useState(1);
  const [entidade, setEntidade] = useState("all");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const entFilter = entidade === "all" ? undefined : entidade;

  const { data, isLoading } = useQuery({
    queryKey: ["auditoria", page, entFilter],
    queryFn: () =>
      api
        .get("/auditoria", {
          params: { page, page_size: 15, entidade_tipo: entFilter },
        })
        .then((r) => r.data),
  });

  const { items: sortedItems, sortField, sortDirection, requestSort } = useSortableData(
    data?.items || [],
    "created_at",
    "desc"
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auditoria do Sistema</h1>
          <p className="text-muted-foreground">
            Trilha de auditoria completa com histórico de alterações, criações e exclusões
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={entidade}
          onValueChange={(v) => {
            setEntidade(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[220px]">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
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

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
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
                  <th className="p-3 font-medium text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((a: any) => (
                  <tr key={a.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium text-muted-foreground">
                      {formatDate(a.created_at)}
                    </td>
                    <td className="p-3">
                      <span className="font-semibold">{a.usuario_nome || "Sistema"}</span>
                    </td>
                    <td className="p-3">
                      <Badge variant={actionColors[a.acao] || "outline"}>
                        {a.acao}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground uppercase">
                      {a.entidade_tipo}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(a)}
                      >
                        <Eye className="mr-1.5 h-4 w-4" /> Ver Dados
                      </Button>
                    </td>
                  </tr>
                ))}
                {sortedItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Nenhum registro de auditoria encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Total de {data.total} registros de auditoria
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {data.total_pages}
                </span>
                <Button
                  variant="outline"
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
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <span>Registro de Auditoria</span>
            </DialogTitle>
            <DialogDescription>
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
                  <div className="text-xs font-bold uppercase text-muted-foreground mb-1">
                    Dados Anteriores
                  </div>
                  <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto font-mono text-muted-foreground">
                    {JSON.stringify(selectedLog.dados_anteriores, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.dados_novos && (
                <div>
                  <div className="text-xs font-bold uppercase text-primary mb-1">
                    Dados Novos / Parâmetros
                  </div>
                  <pre className="p-3 bg-primary/5 border border-primary/20 rounded-md text-xs overflow-x-auto font-mono text-foreground">
                    {JSON.stringify(selectedLog.dados_novos, null, 2)}
                  </pre>
                </div>
              )}

              {!selectedLog.dados_anteriores && !selectedLog.dados_novos && (
                <p className="text-sm text-muted-foreground">
                  Nenhum dado adicional associado a este registro.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
