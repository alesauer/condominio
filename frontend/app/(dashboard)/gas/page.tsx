"use client";
import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";
import type { PaginatedResponse } from "@/types";

interface Leitura { id: string; apartamento_id: string; competencia: string; leitura_anterior: number | null; leitura_atual: number; consumo: number | null; valor_cobrado: number | null; }
export default function GasPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ["gas", page], queryFn: () => api.get<PaginatedResponse<Leitura>>(`/gas?page=${page}&page_size=10`).then(r => r.data) });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Gás</h1><p className="text-muted-foreground">Leituras de gás por apartamento</p></div><Link href="/gas/novo"><Button><Plus className="mr-2 h-4 w-4" /> Nova Leitura</Button></Link></div>
      {isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
        <div className="rounded-md border"><table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50 text-left"><th className="p-3 font-medium">Apartamento</th><th className="p-3 font-medium">Competência</th><th className="p-3 font-medium">Leitura Ant.</th><th className="p-3 font-medium">Leitura Atual</th><th className="p-3 font-medium">Consumo</th><th className="p-3 font-medium">Valor</th></tr></thead>
          <tbody>
            {data?.items.map((l) => (
              <tr key={l.id} className="border-b hover:bg-muted/30"><td className="p-3">{l.apartamento_id}</td><td className="p-3">{formatDate(l.competencia)}</td><td className="p-3">{l.leitura_anterior ?? "-"}</td><td className="p-3 font-medium">{l.leitura_atual}</td><td className="p-3">{l.consumo ?? "-"} m³</td><td className="p-3">{l.valor_cobrado ? formatCurrency(l.valor_cobrado) : "-"}</td></tr>
            ))}
            {data?.items.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma leitura encontrada</td></tr>}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
