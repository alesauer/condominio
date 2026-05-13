"use client";

import { useState } from "react";
import Link from "next/link";
import { useDespesas, useDeleteDespesa } from "@/services/despesas.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = { pendente: "outline", pago: "default", atrasado: "destructive", cancelado: "secondary" };
const tipoLabel: Record<string, string> = { ordinaria: "Ordinária", extraordinaria: "Extraordinária" };

export default function DespesasPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useDespesas({ page, page_size: 10 });
  const deleteMut = useDeleteDespesa();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Despesas</h1><p className="text-muted-foreground">Gerencie as despesas do condomínio</p></div>
        <Link href="/financeiro/despesas/nova"><Button><Plus className="mr-2 h-4 w-4" /> Nova</Button></Link>
      </div>
      {isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left"><th className="p-3 font-medium">Descrição</th><th className="p-3 font-medium">Tipo</th><th className="p-3 font-medium">Valor</th><th className="p-3 font-medium">Competência</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium text-right">Ações</th></tr></thead>
            <tbody>
              {data?.items.map((d) => (
                <tr key={d.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{d.descricao}</td><td className="p-3">{tipoLabel[d.tipo]}</td>
                  <td className="p-3">{formatCurrency(d.valor)}</td>
                  <td className="p-3">{formatDate(d.competencia)}</td>
                  <td className="p-3"><Badge variant={statusColor[d.status]}>{d.status}</Badge></td>
                  <td className="p-3 text-right">
                    <Link href={`/financeiro/despesas/${d.id}`}><Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button></Link>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir?")) deleteMut.mutateAsync(d.id).then(() => toast.success("Excluído")).catch(() => toast.error("Erro")); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma despesa encontrada</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
