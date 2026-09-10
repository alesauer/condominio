"use client";
import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useSortableData } from "@/hooks/use-sortable-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";
import type { PaginatedResponse } from "@/types";

interface Leitura { id: string; apartamento_id: string; competencia: string; leitura_anterior: number | null; leitura_atual: number; consumo: number | null; valor_cobrado: number | null; }

export default function GasPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ["gas", page], queryFn: () => api.get<PaginatedResponse<Leitura>>(`/gas?page=${page}&page_size=10`).then(r => r.data) });

  const { items: sortedItems, sortField, sortDirection, requestSort } = useSortableData(
    data?.items || [],
    "competencia",
    "desc"
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Gás</h1><p className="text-muted-foreground">Leituras de gás por apartamento</p></div><Link href="/gas/novo"><Button><Plus className="mr-2 h-4 w-4" /> Nova Leitura</Button></Link></div>
      {isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <SortableHeader field="apartamento_id" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                  Apartamento
                </SortableHeader>
                <SortableHeader field="competencia" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                  Competência
                </SortableHeader>
                <SortableHeader field="leitura_anterior" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                  Leitura Ant.
                </SortableHeader>
                <SortableHeader field="leitura_atual" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                  Leitura Atual
                </SortableHeader>
                <SortableHeader field="consumo" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                  Consumo
                </SortableHeader>
                <SortableHeader field="valor_cobrado" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                  Valor
                </SortableHeader>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((l) => (
                <tr key={l.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{l.apartamento_id}</td>
                  <td className="p-3">{formatDate(l.competencia)}</td>
                  <td className="p-3 text-right">{l.leitura_anterior ?? "-"}</td>
                  <td className="p-3 text-right font-medium">{l.leitura_atual}</td>
                  <td className="p-3 text-right">{l.consumo != null ? `${l.consumo} m³` : "-"}</td>
                  <td className="p-3 text-right font-semibold">{l.valor_cobrado ? formatCurrency(l.valor_cobrado) : "-"}</td>
                </tr>
              ))}
              {sortedItems.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma leitura encontrada</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
