"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useSortableData } from "@/hooks/use-sortable-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

interface RateioDetail { id: string; competencia: string; valor_total: number; observacao: string | null; apartamentos: { apartamento_id: string; peso: number; soma_pesos: number; valor_calculado: number }[]; }

export default function RateioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({ queryKey: ["agua", id], queryFn: () => api.get<RateioDetail>(`/agua/${id}`).then(r => r.data), enabled: !!id });

  const { items: sortedApartamentos, sortField, sortDirection, requestSort } = useSortableData(
    data?.apartamentos || [],
    "apartamento_id",
    "asc"
  );

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div>;
  if (!data) return <div>Rateio não encontrado</div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-2"><Link href="/agua"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link><h1 className="text-2xl font-bold">Rateio de Água</h1></div>
      <Card><CardHeader><CardTitle>Competência: {formatDate(data.competencia)}</CardTitle></CardHeader>
        <CardContent><p className="text-lg font-bold">{formatCurrency(data.valor_total)}</p>{data.observacao && <p className="text-sm text-muted-foreground">{data.observacao}</p>}</CardContent></Card>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <SortableHeader field="apartamento_id" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                Apartamento
              </SortableHeader>
              <SortableHeader field="peso" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                Peso
              </SortableHeader>
              <SortableHeader field="soma_pesos" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                Soma Pesos
              </SortableHeader>
              <SortableHeader field="valor_calculado" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                Valor Calculado
              </SortableHeader>
            </tr>
          </thead>
          <tbody>
            {sortedApartamentos.map((a, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-3">{a.apartamento_id}</td>
                <td className="p-3 text-right">{a.peso}</td>
                <td className="p-3 text-right">{a.soma_pesos}</td>
                <td className="p-3 text-right font-medium">{formatCurrency(a.valor_calculado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
