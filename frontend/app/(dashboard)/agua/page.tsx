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
import { Plus, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { PaginatedResponse } from "@/types";

interface AguaRateio { id: string; competencia: string; valor_total: number; observacao: string | null; created_at: string; }

export default function AguaPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["agua", page], queryFn: () => api.get<PaginatedResponse<AguaRateio>>(`/agua?page=${page}&page_size=10`).then(r => r.data) });

  const { items: sortedItems, sortField, sortDirection, requestSort } = useSortableData(
    data?.items || [],
    "competencia",
    "desc"
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Água</h1><p className="text-muted-foreground">Rateios de água por competência</p></div><Link href="/agua/novo"><Button><Plus className="mr-2 h-4 w-4" /> Novo Rateio</Button></Link></div>
      {isLoading ? <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <SortableHeader field="competencia" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                  Competência
                </SortableHeader>
                <SortableHeader field="valor_total" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                  Valor Total
                </SortableHeader>
                <SortableHeader field="observacao" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                  Observação
                </SortableHeader>
                <th className="p-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{formatDate(r.competencia)}</td>
                  <td className="p-3 text-right font-semibold">{formatCurrency(r.valor_total)}</td>
                  <td className="p-3">{r.observacao || "-"}</td>
                  <td className="p-3 text-right">
                    <Link href={`/agua/${r.id}`}><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></Link>
                    <Button variant="ghost" size="icon" onClick={async () => { if (confirm("Excluir?")) { await api.delete(`/agua/${r.id}`); refetch(); toast.success("Excluído"); } }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </td>
                </tr>
              ))}
              {sortedItems.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhum rateio encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
