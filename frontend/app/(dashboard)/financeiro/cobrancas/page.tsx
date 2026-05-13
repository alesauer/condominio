"use client";

import { useState } from "react";
import { useCobrancas, usePagarCobranca } from "@/services/cobrancas.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";

const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = { pendente: "outline", pago: "default", atrasado: "destructive", cancelado: "secondary" };

export default function CobrancasPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCobrancas({ page, page_size: 10 });
  const pagarMut = usePagarCobranca();

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Cobranças</h1><p className="text-muted-foreground">Cobranças por apartamento</p></div>
      {isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left"><th className="p-3 font-medium">Descrição</th><th className="p-3 font-medium">Competência</th><th className="p-3 font-medium">Vencimento</th><th className="p-3 font-medium">Valor</th><th className="p-3 font-medium">Total</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium text-right">Ações</th></tr></thead>
            <tbody>
              {data?.items.map((c) => (
                <tr key={c.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{c.descricao}</td>
                  <td className="p-3">{formatDate(c.competencia)}</td>
                  <td className="p-3">{formatDate(c.vencimento)}</td>
                  <td className="p-3">{formatCurrency(c.valor)}</td>
                  <td className="p-3">{formatCurrency(c.valor_total)}</td>
                  <td className="p-3"><Badge variant={statusColor[c.status]}>{c.status}</Badge></td>
                  <td className="p-3 text-right">
                    {c.status !== "pago" && (
                      <Button variant="ghost" size="sm" onClick={() => pagarMut.mutateAsync(c.id).then(() => toast.success("Pagamento registrado")).catch(() => toast.error("Erro"))}>
                        <CheckCircle className="mr-1 h-4 w-4 text-green-500" /> Pagar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhuma cobrança encontrada</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
