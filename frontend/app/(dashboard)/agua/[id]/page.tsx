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

interface RateioApartamento {
  id: string;
  apartamento_id: string;
  peso: number;
  soma_pesos: number;
  valor_calculado: number;
  apartamento_numero?: string;
  apartamento_bloco?: string;
  apartamento_tipo?: string;
  fracao_ideal?: number;
}

interface RateioDetail {
  id: string;
  competencia: string;
  valor_total: number;
  observacao: string | null;
  apartamentos: RateioApartamento[];
}

function formatTipo(tipo?: string) {
  if (!tipo) return "-";
  switch (tipo) {
    case "padrao":
      return "Padrão";
    case "area_privativa":
      return "Área Privativa";
    case "cobertura":
      return "Cobertura";
    default:
      return tipo;
  }
}

export default function RateioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["agua", id],
    queryFn: () => api.get<RateioDetail>(`/agua/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { items: sortedApartamentos, sortField, sortDirection, requestSort } = useSortableData(
    data?.apartamentos || [],
    "apartamento_numero",
    "asc"
  );

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div>;
  if (!data) return <div>Rateio não encontrado</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-2">
        <Link href="/agua">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Rateio de Água</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Competência: {formatDate(data.competencia)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-2xl font-bold text-primary">{formatCurrency(data.valor_total)}</p>
          {data.observacao && <p className="text-sm text-muted-foreground">{data.observacao}</p>}
          <p className="text-xs text-muted-foreground pt-1">
            Divisão calculada de acordo com a fração ideal cadastrada de cada apartamento.
          </p>
        </CardContent>
      </Card>
      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <SortableHeader field="apartamento_numero" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                Apartamento
              </SortableHeader>
              <SortableHeader field="apartamento_tipo" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                Tipo
              </SortableHeader>
              <SortableHeader field="fracao_ideal" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                Fração Ideal
              </SortableHeader>
              <SortableHeader field="valor_calculado" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                Valor Rateado
              </SortableHeader>
            </tr>
          </thead>
          <tbody>
            {sortedApartamentos.map((a) => {
              const displayApto = a.apartamento_numero
                ? `Apto ${a.apartamento_numero}${a.apartamento_bloco ? ` - ${a.apartamento_bloco}` : ""}`
                : a.apartamento_id;
              const fracaoVal = a.fracao_ideal !== undefined && a.fracao_ideal !== null ? a.fracao_ideal : a.peso;
              const fracaoPct =
                fracaoVal !== undefined && fracaoVal !== null
                  ? `${(Number(fracaoVal) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`
                  : "-";

              return (
                <tr key={a.id || a.apartamento_id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{displayApto}</td>
                  <td className="p-3 text-muted-foreground">{formatTipo(a.apartamento_tipo)}</td>
                  <td className="p-3 text-right">{fracaoPct}</td>
                  <td className="p-3 text-right font-semibold text-primary">{formatCurrency(a.valor_calculado)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/20 font-medium">
              <td className="p-3" colSpan={2}>
                Total Geral ({sortedApartamentos.length} unidades)
              </td>
              <td className="p-3 text-right">
                {sortedApartamentos.length > 0 ? "100,00%" : "-"}
              </td>
              <td className="p-3 text-right font-bold text-base text-primary">
                {formatCurrency(data.valor_total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

