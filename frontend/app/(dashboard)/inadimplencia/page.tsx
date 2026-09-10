"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useSortableData } from "@/hooks/use-sortable-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function InadimplenciaPage() {
  const qc = useQueryClient();
  const { data: config, isLoading: configLoading } = useQuery({ queryKey: ["inadimplencia", "config"], queryFn: () => api.get("/inadimplencia/config").then(r => r.data) });
  const { data: atrasadas, isLoading: atrasLoading } = useQuery({ queryKey: ["inadimplencia", "atrasadas"], queryFn: () => api.get("/inadimplencia/cobrancas-atrasadas").then(r => r.data) });
  const [form, setForm] = useState({ percentual_multa: "2.00", percentual_juros_mes: "1.00", dias_tolerancia: "5" });

  const { items: sortedAtrasadas, sortField, sortDirection, requestSort } = useSortableData(
    atrasadas || [],
    "vencimento",
    "asc"
  );

  useEffect(() => {
    if (config) setForm({ percentual_multa: String(config.percentual_multa), percentual_juros_mes: String(config.percentual_juros_mes), dias_tolerancia: String(config.dias_tolerancia) });
  }, [config]);

  const saveConfig = async () => {
    try { await api.put("/inadimplencia/config", { percentual_multa: Number(form.percentual_multa), percentual_juros_mes: Number(form.percentual_juros_mes), dias_tolerancia: Number(form.dias_tolerancia) }); qc.invalidateQueries({ queryKey: ["inadimplencia"] }); toast.success("Configuração salva"); }
    catch { toast.error("Erro ao salvar"); }
  };

  const recalcular = async () => {
    try { await api.post("/inadimplencia/recalcular"); qc.invalidateQueries({ queryKey: ["inadimplencia"] }); toast.success("Multas e juros recalculados"); }
    catch { toast.error("Erro"); }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Inadimplência</h1><p className="text-muted-foreground">Configuração e acompanhamento de inadimplentes</p></div>
      {configLoading ? <Skeleton className="h-40" /> : (
        <Card><CardHeader><CardTitle>Configuração</CardTitle></CardHeader><CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="space-y-2"><Label>Multa (%)</Label><Input type="number" step="0.01" value={form.percentual_multa} onChange={e => setForm({...form, percentual_multa: e.target.value})} /></div>
            <div className="space-y-2"><Label>Juros ao mês (%)</Label><Input type="number" step="0.01" value={form.percentual_juros_mes} onChange={e => setForm({...form, percentual_juros_mes: e.target.value})} /></div>
            <div className="space-y-2"><Label>Dias de Tolerância</Label><Input type="number" value={form.dias_tolerancia} onChange={e => setForm({...form, dias_tolerancia: e.target.value})} /></div>
          </div>
          <div className="flex gap-2"><Button onClick={saveConfig}>Salvar Configuração</Button><Button variant="outline" onClick={recalcular}>Recalcular Multas/Juros</Button></div>
        </CardContent></Card>
      )}
      {atrasLoading ? <Skeleton className="h-60" /> : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <SortableHeader field="descricao" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                  Descrição
                </SortableHeader>
                <SortableHeader field="vencimento" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                  Vencimento
                </SortableHeader>
                <SortableHeader field="valor" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                  Valor
                </SortableHeader>
                <SortableHeader field="multa" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                  Multa
                </SortableHeader>
                <SortableHeader field="juros" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                  Juros
                </SortableHeader>
                <SortableHeader field="valor_total" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                  Total
                </SortableHeader>
                <SortableHeader field="status" currentField={sortField} direction={sortDirection} onSort={requestSort} align="center">
                  Status
                </SortableHeader>
              </tr>
            </thead>
            <tbody>
              {sortedAtrasadas.map((c: any) => (
                <tr key={c.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{c.descricao}</td>
                  <td className="p-3">{formatDate(c.vencimento)}</td>
                  <td className="p-3 text-right">{formatCurrency(c.valor)}</td>
                  <td className="p-3 text-right">{formatCurrency(c.multa || 0)}</td>
                  <td className="p-3 text-right">{formatCurrency(c.juros || 0)}</td>
                  <td className="p-3 text-right font-bold">{formatCurrency(c.valor_total)}</td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
              {sortedAtrasadas.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhuma cobrança em atraso</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
