"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

interface RateioDetail { id: string; competencia: string; valor_total: number; observacao: string | null; apartamentos: { apartamento_id: string; peso: number; soma_pesos: number; valor_calculado: number }[]; }

export default function RateioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({ queryKey: ["agua", id], queryFn: () => api.get<RateioDetail>(`/agua/${id}`).then(r => r.data), enabled: !!id });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div>;
  if (!data) return <div>Rateio não encontrado</div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-2"><Link href="/agua"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link><h1 className="text-2xl font-bold">Rateio de Água</h1></div>
      <Card><CardHeader><CardTitle>Competência: {formatDate(data.competencia)}</CardTitle></CardHeader>
        <CardContent><p className="text-lg font-bold">{formatCurrency(data.valor_total)}</p>{data.observacao && <p className="text-sm text-muted-foreground">{data.observacao}</p>}</CardContent></Card>
      <div className="rounded-md border"><table className="w-full text-sm">
        <thead><tr className="border-b bg-muted/50 text-left"><th className="p-3 font-medium">Apartamento</th><th className="p-3 font-medium">Peso</th><th className="p-3 font-medium">Soma Pesos</th><th className="p-3 font-medium text-right">Valor Calculado</th></tr></thead>
        <tbody>
          {data.apartamentos.map((a, i) => (
            <tr key={i} className="border-b hover:bg-muted/30"><td className="p-3">{a.apartamento_id}</td><td className="p-3">{a.peso}</td><td className="p-3">{a.soma_pesos}</td><td className="p-3 text-right font-medium">{formatCurrency(a.valor_calculado)}</td></tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}
