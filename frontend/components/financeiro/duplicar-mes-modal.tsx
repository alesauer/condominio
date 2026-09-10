"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Copy,
  ArrowRight,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useVerificarDuplicacaoReceitas, useDuplicarReceitasMes } from "@/services/receitas.service";
import { useVerificarDuplicacaoDespesas, useDuplicarDespesasMes } from "@/services/despesas.service";

const MESES = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const ANOS = ["2024", "2025", "2026", "2027", "2028"];

interface DuplicarMesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: "receitas" | "despesas";
  mesAtual: number;
  anoAtual: number;
  onSuccess: (mesDestino: number, anoDestino: number) => void;
}

export function DuplicarMesModal({
  isOpen,
  onClose,
  tipo,
  mesAtual,
  anoAtual,
  onSuccess,
}: DuplicarMesModalProps) {
  // Origin is bound to current view by default
  const mesOrigem = mesAtual;
  const anoOrigem = anoAtual;

  // Next month calculation as default destination
  const defaultNextMonth = mesAtual === 12 ? 1 : mesAtual + 1;
  const defaultNextYear = mesAtual === 12 ? anoAtual + 1 : anoAtual;

  const [mesDestino, setMesDestino] = useState<number>(defaultNextMonth);
  const [anoDestino, setAnoDestino] = useState<number>(defaultNextYear);
  const [sobrescreverConfirmado, setSobrescreverConfirmado] = useState(false);

  // Mutations
  const verificarReceitasMut = useVerificarDuplicacaoReceitas();
  const verificarDespesasMut = useVerificarDuplicacaoDespesas();
  const duplicarReceitasMut = useDuplicarReceitasMes();
  const duplicarDespesasMut = useDuplicarDespesasMes();

  const [verificacao, setVerificacao] = useState<{
    total_origem: number;
    total_destino: number;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Sync state on open or change of origin
  useEffect(() => {
    if (isOpen) {
      const nextM = mesAtual === 12 ? 1 : mesAtual + 1;
      const nextY = mesAtual === 12 ? anoAtual + 1 : anoAtual;
      setMesDestino(nextM);
      setAnoDestino(nextY);
      setSobrescreverConfirmado(false);
    }
  }, [isOpen, mesAtual, anoAtual]);

  // Run verification whenever origin or destination changes while open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsVerifying(true);
    setSobrescreverConfirmado(false);

    const check = async () => {
      try {
        const payload = {
          mes_origem: mesOrigem,
          ano_origem: anoOrigem,
          mes_destino: mesDestino,
          ano_destino: anoDestino,
        };

        const res =
          tipo === "receitas"
            ? await verificarReceitasMut.mutateAsync(payload)
            : await verificarDespesasMut.mutateAsync(payload);

        if (isMounted) {
          setVerificacao({
            total_origem: res.total_origem,
            total_destino: res.total_destino,
          });
        }
      } catch (err) {
        console.error("Erro ao verificar duplicação", err);
      } finally {
        if (isMounted) setIsVerifying(false);
      }
    };

    check();

    return () => {
      isMounted = false;
    };
  }, [isOpen, tipo, mesOrigem, anoOrigem, mesDestino, anoDestino]);

  const nomeMesOrigem = useMemo(
    () => MESES.find((m) => m.value === String(mesOrigem))?.label || "",
    [mesOrigem]
  );
  const nomeMesDestino = useMemo(
    () => MESES.find((m) => m.value === String(mesDestino))?.label || "",
    [mesDestino]
  );

  const isExecuting = duplicarReceitasMut.isPending || duplicarDespesasMut.isPending;
  const temDestinoRegistros = (verificacao?.total_destino || 0) > 0;
  const semOrigemRegistros = verificacao !== null && verificacao.total_origem === 0;

  const canSubmit =
    !isVerifying &&
    !isExecuting &&
    !semOrigemRegistros &&
    (!temDestinoRegistros || sobrescreverConfirmado);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      const payload = {
        mes_origem: mesOrigem,
        ano_origem: anoOrigem,
        mes_destino: mesDestino,
        ano_destino: anoDestino,
        sobrescrever: temDestinoRegistros,
      };

      const res =
        tipo === "receitas"
          ? await duplicarReceitasMut.mutateAsync(payload)
          : await duplicarDespesasMut.mutateAsync(payload);

      toast.success(res.mensagem || "Dados duplicados com sucesso!");
      onSuccess(mesDestino, anoDestino);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Erro ao duplicar dados.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isExecuting && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-full bg-primary/10 text-primary">
              <Copy className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                Duplicar {tipo === "receitas" ? "Receitas" : "Despesas"}
              </DialogTitle>
              <DialogDescription>
                Copie todos os lançamentos do mês atual para o mês posterior com status pendente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Visual Route: De -> Para */}
          <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-2 p-3.5 rounded-xl border bg-muted/40">
            {/* Origem */}
            <div className="md:col-span-2 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Mês de Origem
              </span>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-background border font-medium text-sm text-foreground">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">
                  {nomeMesOrigem} / {anoOrigem}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground px-1">
                {isVerifying ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Verificando...
                  </span>
                ) : (
                  <span>{verificacao?.total_origem ?? 0} {tipo} encontrada(s)</span>
                )}
              </div>
            </div>

            {/* Seta indicativa */}
            <div className="flex justify-center py-1 md:py-0 md:col-span-1">
              <div className="p-1.5 rounded-full bg-muted text-muted-foreground">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>

            {/* Destino */}
            <div className="md:col-span-2 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Mês de Destino
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <Select
                  value={String(mesDestino)}
                  onValueChange={(v) => setMesDestino(parseInt(v, 10))}
                  disabled={isExecuting}
                >
                  <SelectTrigger className="h-9 bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={String(anoDestino)}
                  onValueChange={(v) => setAnoDestino(parseInt(v, 10))}
                  disabled={isExecuting}
                >
                  <SelectTrigger className="h-9 bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANOS.map((ano) => (
                      <SelectItem key={ano} value={ano} className="text-xs">
                        {ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-[11px] text-muted-foreground px-1">
                {isVerifying ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Verificando...
                  </span>
                ) : (
                  <span>
                    {temDestinoRegistros ? (
                      <strong className="text-amber-600 dark:text-amber-400">
                        {verificacao?.total_destino} {tipo} existente(s)
                      </strong>
                    ) : (
                      "Nenhum registro existente"
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Aviso quando não há dados na origem */}
          {semOrigemRegistros && !isVerifying && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Nenhum registro no mês de origem</p>
                <p className="mt-0.5 text-muted-foreground">
                  Não existem {tipo} cadastradas em {nomeMesOrigem}/{anoOrigem} para duplicar.
                </p>
              </div>
            </div>
          )}

          {/* Alerta quando o mês de destino já possui registros */}
          {temDestinoRegistros && !semOrigemRegistros && !isVerifying && (
            <div className="p-3.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-700 dark:text-rose-300 text-sm">
                    Atenção: Os dados existentes serão apagados!
                  </p>
                  <p className="text-rose-600 dark:text-rose-400 leading-relaxed">
                    O mês de destino (<strong>{nomeMesDestino}/{anoDestino}</strong>) já possui{" "}
                    <strong>{verificacao?.total_destino} {tipo} cadastrada(s)</strong>. Se você
                    continuar,{" "}
                    <span className="underline font-semibold">
                      esses dados serão permanentemente excluídos
                    </span>{" "}
                    e substituídos pelas {verificacao?.total_origem} {tipo} de{" "}
                    {nomeMesOrigem}/{anoOrigem}.
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2.5 pt-1.5 border-t border-rose-500/20 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sobrescreverConfirmado}
                  onChange={(e) => setSobrescreverConfirmado(e.target.checked)}
                  className="h-4 w-4 rounded border-rose-400 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-rose-800 dark:text-rose-200">
                  Estou ciente e autorizo apagar os registros existentes em {nomeMesDestino}/{anoDestino}
                </span>
              </label>
            </div>
          )}

          {/* Dica sobre como a duplicação funciona */}
          {!semOrigemRegistros && !temDestinoRegistros && !isVerifying && (
            <div className="p-3 rounded-lg border bg-blue-500/5 border-blue-500/20 text-xs text-muted-foreground flex items-start gap-2.5">
              <Layers className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p>
                Os registros serão duplicados para <strong>{nomeMesDestino}/{anoDestino}</strong> com
                status <strong>PENDENTE</strong> e os comprovantes e datas de pagamento limpos.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isExecuting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className={
                temDestinoRegistros
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }
            >
              {isExecuting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Duplicando...
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  {temDestinoRegistros
                    ? `Sobrescrever e Duplicar para ${nomeMesDestino}/${anoDestino}`
                    : `Duplicar para ${nomeMesDestino}/${anoDestino}`}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
