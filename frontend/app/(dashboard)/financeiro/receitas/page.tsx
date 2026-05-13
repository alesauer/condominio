"use client";

import { useState } from "react";
import Link from "next/link";
import { useReceitas, useDeleteReceita } from "@/services/receitas.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = { pendente: "outline", pago: "default", atrasado: "destructive", cancelado: "secondary" };
const tipoLabel: Record<string, string> = { condominio: "Condomínio", fundo_reserva: "Fundo Reserva", taxa_extra: "Taxa Extra" };

export default function ReceitasPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useReceitas({ page, page_size: 10 });
  const deleteMut = useDeleteReceita();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Receitas</h1><p className="text-muted-foreground">Gerencie as receitas do condomínio</p></div>
        <Link href="/financeiro/receitas/nova"><Button><Plus className="mr-2 h-4 w-4" /> Nova</Button></Link>
      </div>
      {isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left"><th className="p-3 font-medium">Descrição</th><th className="p-3 font-medium">Tipo</th><th className="p-3 font-medium">Valor</th><th className="p-3 font-medium">Competência</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium text-right">Ações</th></tr></thead>
            <tbody>
              {data?.items.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{r.descricao}</td><td className="p-3">{tipoLabel[r.tipo]}</td>
                  <td className="p-3">{formatCurrency(r.valor)}</td>
                  <td className="p-3">{formatDate(r.competencia)}</td>
                  <td className="p-3"><Badge variant={statusColor[r.status]}>{r.status}</Badge></td>
                  <td className="p-3 text-right">
                    <Link href={`/financeiro/receitas/${r.id}`}><Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button></Link>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir?")) deleteMut.mutateAsync(r.id).then(() => toast.success("Excluído")).catch(() => toast.error("Erro")); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma receita encontrada</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
