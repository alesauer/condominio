"use client";

import { useState, useMemo } from "react";
import {
  useCobrancas,
  usePagarCobranca,
  useGerarCobrancasMensais,
} from "@/services/cobrancas.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useSortableData } from "@/hooks/use-sortable-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CheckCircle, PlusCircle, Filter } from "lucide-react";
import { toast } from "sonner";

export default function CobrancasPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form de geração mensal
  const today = new Date();
  const defaultComp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultVenc = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-10`;

  const [formGerar, setFormGerar] = useState({
    competencia: defaultComp,
    vencimento: defaultVenc,
    valor_base_condominio: "350.00",
    incluir_agua: true,
    incluir_gas: true,
    descricao: "",
  });

  const { data, isLoading } = useCobrancas({
    page,
    page_size: 15,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const enrichedItems = useMemo(() => {
    return (data?.items || []).map((c) => ({
      ...c,
      multa_juros: (c.multa || 0) + (c.juros || 0),
    }));
  }, [data?.items]);

  const { items: sortedItems, sortField, sortDirection, requestSort } = useSortableData(
    enrichedItems,
    "status",
    "asc"
  );

  const pagarMut = usePagarCobranca();
  const gerarMut = useGerarCobrancasMensais();

  const handlePagar = async (id: string) => {
    try {
      await pagarMut.mutateAsync(id);
      toast.success("Pagamento registrado com sucesso!");
    } catch {
      toast.error("Erro ao registrar pagamento.");
    }
  };

  const handleGerarMensal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await gerarMut.mutateAsync({
        competencia: formGerar.competencia,
        vencimento: formGerar.vencimento,
        valor_base_condominio: Number(formGerar.valor_base_condominio) || 0,
        incluir_agua: formGerar.incluir_agua,
        incluir_gas: formGerar.incluir_gas,
        descricao: formGerar.descricao || undefined,
      });
      toast.success(`${res.geradas} cobranças geradas com sucesso! Total: ${formatCurrency(res.total_valor)}`);
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Erro ao gerar cobranças.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cobranças</h1>
          <p className="text-muted-foreground">
            Controle e emissão de cobranças por apartamento
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Gerar Cobranças do Mês
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Gerar Lote de Cobranças</DialogTitle>
              <DialogDescription>
                Consolida a taxa base do condomínio, rateio de água e consumo de gás da competência.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleGerarMensal} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="competencia">Competência (Mês)</Label>
                  <Input
                    id="competencia"
                    type="date"
                    required
                    value={formGerar.competencia}
                    onChange={(e) => setFormGerar({ ...formGerar, competencia: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vencimento">Vencimento</Label>
                  <Input
                    id="vencimento"
                    type="date"
                    required
                    value={formGerar.vencimento}
                    onChange={(e) => setFormGerar({ ...formGerar, vencimento: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_base">Taxa Base de Condomínio (R$)</Label>
                <Input
                  id="valor_base"
                  type="number"
                  step="0.01"
                  required
                  value={formGerar.valor_base_condominio}
                  onChange={(e) => setFormGerar({ ...formGerar, valor_base_condominio: e.target.value })}
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Incluir Rateio de Água</Label>
                    <p className="text-xs text-muted-foreground">Soma o rateio de água apurado no mês</p>
                  </div>
                  <Switch
                    checked={formGerar.incluir_agua}
                    onCheckedChange={(v) => setFormGerar({ ...formGerar, incluir_agua: v })}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Incluir Consumo de Gás</Label>
                    <p className="text-xs text-muted-foreground">Soma o valor das leituras individuais</p>
                  </div>
                  <Switch
                    checked={formGerar.incluir_gas}
                    onCheckedChange={(v) => setFormGerar({ ...formGerar, incluir_gas: v })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição Personalizada (Opcional)</Label>
                <Input
                  id="descricao"
                  placeholder="Ex: Condomínio + Taxa Reforma"
                  value={formGerar.descricao}
                  onChange={(e) => setFormGerar({ ...formGerar, descricao: e.target.value })}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={gerarMut.isPending}>
                  {gerarMut.isPending ? "Gerando..." : "Confirmar e Gerar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <SortableHeader field="descricao" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                    Descrição
                  </SortableHeader>
                  <SortableHeader field="competencia" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                    Competência
                  </SortableHeader>
                  <SortableHeader field="vencimento" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                    Vencimento
                  </SortableHeader>
                  <SortableHeader field="valor" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                    Valor Base
                  </SortableHeader>
                  <SortableHeader field="multa_juros" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                    Multa/Juros
                  </SortableHeader>
                  <SortableHeader field="valor_total" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                    Valor Total
                  </SortableHeader>
                  <SortableHeader field="status" currentField={sortField} direction={sortDirection} onSort={requestSort} align="center">
                    Status
                  </SortableHeader>
                  <th className="p-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((c) => {
                  const multaJuros = (c.multa || 0) + (c.juros || 0);
                  const isPago = c.status === "pago";
                  const isAtrasado = c.status === "atrasado";
                  return (
                    <tr key={c.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{c.descricao}</td>
                      <td className="p-3">{formatDate(c.competencia)}</td>
                      <td className="p-3">{formatDate(c.vencimento)}</td>
                      <td className="p-3 text-right">{formatCurrency(c.valor)}</td>
                      <td className="p-3 text-right">{multaJuros > 0 ? formatCurrency(multaJuros) : "—"}</td>
                      <td className="p-3 text-right font-bold">{formatCurrency(c.valor_total)}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            isPago
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : isAtrasado
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold"
                              : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {c.status !== "pago" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePagar(c.id)}
                            disabled={pagarMut.isPending}
                          >
                            <CheckCircle className="mr-1.5 h-4 w-4 text-emerald-500" />
                            Pagar
                          </Button>
                        )}
                        {c.status === "pago" && c.data_pagamento && (
                          <span className="text-xs text-muted-foreground">
                            Pago em {formatDate(c.data_pagamento)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {sortedItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Nenhuma cobrança encontrada para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Total de {data.total} cobranças cadastradas
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {data.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
