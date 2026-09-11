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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail,
  Send,
  Building2,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Users,
  Sparkles,
} from "lucide-react";
import {
  useEnviarDemonstrativoEmail,
  type DemonstrativoMensalResponse,
  type DestinatarioEmailItem,
} from "@/services/cobrancas.service";
import { getDemonstrativoPDFBase64 } from "@/lib/export-demonstrativo-pdf";
import { toast } from "sonner";

interface DestinatarioRow {
  apartamentoNumero: string;
  bloco?: string | null;
  responsavelNome: string;
  email: string;
  selected: boolean;
}

interface EnviarDemonstrativoEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: DemonstrativoMensalResponse;
}

export function EnviarDemonstrativoEmailModal({
  open,
  onOpenChange,
  data,
}: EnviarDemonstrativoEmailModalProps) {
  const [destinatarios, setDestinatarios] = useState<DestinatarioRow[]>([]);
  const [assunto, setAssunto] = useState("");
  const [mensagemPersonalizada, setMensagemPersonalizada] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const enviarEmailMut = useEnviarDemonstrativoEmail();

  // Inicializa lista de destinatários com base nos apartamentos do demonstrativo
  useEffect(() => {
    if (!data) return;

    const initialSubject = `Demonstrativo Mensal de Condomínio — ${data.competencia_formatada} — Residencial Monazita`;
    setAssunto(initialSubject);

    const rows: DestinatarioRow[] = data.apartamentos_header.map((apto) => {
      const email = apto.responsavel_email || "";
      return {
        apartamentoNumero: apto.numero,
        bloco: apto.bloco,
        responsavelNome: apto.responsavel_nome,
        email,
        selected: Boolean(email.trim()),
      };
    });

    setDestinatarios(rows);
  }, [data, open]);

  const handleSelectAll = (select: boolean) => {
    setDestinatarios((prev) =>
      prev.map((row) => ({
        ...row,
        selected: select,
      }))
    );
  };

  const handleToggleSelect = (index: number) => {
    setDestinatarios((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        selected: !next[index].selected,
      };
      return next;
    });
  };

  const handleEmailChange = (index: number, newEmail: string) => {
    setDestinatarios((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        email: newEmail,
        selected: newEmail.trim() ? true : next[index].selected,
      };
      return next;
    });
  };

  const validSelectedCount = useMemo(() => {
    return destinatarios.filter((d) => d.selected && d.email.trim()).length;
  }, [destinatarios]);

  const totalSelectedCount = useMemo(() => {
    return destinatarios.filter((d) => d.selected).length;
  }, [destinatarios]);

  const handleEnviar = async () => {
    if (!data) return;

    const listaEnvio: DestinatarioEmailItem[] = destinatarios
      .filter((d) => d.selected && d.email.trim())
      .map((d) => ({
        apartamento_numero: d.apartamentoNumero,
        nome: d.responsavelNome,
        email: d.email.trim(),
      }));

    if (listaEnvio.length === 0) {
      toast.error("Selecione pelo menos um apartamento com e-mail preenchido.");
      return;
    }

    try {
      setIsGeneratingPDF(true);
      // Gera o PDF vetorial em base64 diretamente do layout
      const pdfBase64 = getDemonstrativoPDFBase64(data);
      setIsGeneratingPDF(false);

      const res = await enviarEmailMut.mutateAsync({
        competencia: data.competencia,
        destinatarios: listaEnvio,
        assunto: assunto.trim() || undefined,
        mensagem_personalizada: mensagemPersonalizada.trim() || undefined,
        pdf_base64: pdfBase64,
      });

      if (res.total_enviados > 0) {
        toast.success(
          `Demonstrativo enviado com sucesso para ${res.total_enviados} destinatário(s) com o PDF em anexo!`
        );
      }
      if (res.total_falhas > 0) {
        toast.warning(`${res.total_falhas} envio(s) não puderam ser entregues.`);
      }

      onOpenChange(false);
    } catch (err: any) {
      setIsGeneratingPDF(false);
      toast.error(
        err?.response?.data?.detail || "Erro ao processar envio de e-mails."
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2 text-base">
                Enviar Demonstrativo por E-mail
                <Badge variant="outline" className="text-xs font-mono">
                  {data?.competencia_formatada}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                O arquivo PDF oficial com todas as tabelas e memória de cálculo será anexado e despachado aos responsáveis.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Assunto do E-mail */}
          <div className="space-y-1.5">
            <Label htmlFor="input-assunto-email" className="text-xs font-semibold">
              Assunto da Mensagem
            </Label>
            <Input
              id="input-assunto-email"
              className="h-8 text-xs font-medium"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Ex: Demonstrativo Mensal de Condomínio - Setembro/2026"
            />
          </div>

          {/* Mensagem da Administração (Opcional) */}
          <div className="space-y-1.5">
            <Label htmlFor="input-msg-custom" className="text-xs font-semibold">
              Mensagem ou Comunicado Adicional (Opcional)
            </Label>
            <textarea
              id="input-msg-custom"
              rows={2}
              className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-sans"
              placeholder="Ex: Informamos que a assembleia ordinária será realizada no próximo dia 20..."
              value={mensagemPersonalizada}
              onChange={(e) => setMensagemPersonalizada(e.target.value)}
            />
          </div>

          {/* Anexo Informativo */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/30 text-xs text-muted-foreground">
            <Paperclip className="h-4 w-4 text-indigo-500 shrink-0" />
            <span>
              <strong>Anexo incluído automaticamente:</strong>{" "}
              <code>Demonstrativo_Condominio_{data?.competencia?.replace("-", "_")}.pdf</code>{" "}
              (Fechamento, Despesas, Rateio Copasa, Gás e Fundo de Reserva).
            </span>
          </div>

          {/* Seleção de Destinatários */}
          <div className="space-y-2 border rounded-lg p-3 bg-card shadow-xs">
            <div className="flex items-center justify-between pb-1 border-b">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Destinatários por Apartamento ({validSelectedCount}/{destinatarios.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectAll(true)}
                  className="h-6 px-2 text-[11px]"
                >
                  Marcar Todos
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectAll(false)}
                  className="h-6 px-2 text-[11px]"
                >
                  Desmarcar
                </Button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {destinatarios.map((row, idx) => (
                <div
                  key={row.apartamentoNumero}
                  onClick={() => handleToggleSelect(idx)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                    row.selected
                      ? "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 shadow-xs"
                      : "bg-muted/10 border-border/70 hover:bg-muted/30 opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-[190px] select-none">
                    <Checkbox
                      checked={row.selected}
                      onCheckedChange={() => handleToggleSelect(idx)}
                      id={`chk-${row.apartamentoNumero}`}
                    />
                    <div>
                      <span className="font-bold text-foreground block">
                        Apto {row.apartamentoNumero}
                        {row.bloco ? ` - ${row.bloco}` : ""}
                      </span>
                      <span className="text-[11px] text-muted-foreground block truncate max-w-[170px]">
                        {row.responsavelNome || "Sem responsável cadastrado"}
                      </span>
                    </div>
                  </div>

                  <div
                    className="flex-1 w-full sm:w-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Input
                      type="email"
                      placeholder="Adicionar e-mail do responsável..."
                      className={`h-8 text-xs transition-colors ${
                        row.selected && !row.email.trim()
                          ? "border-amber-400 focus-visible:ring-amber-400 bg-amber-50/20"
                          : ""
                      }`}
                      value={row.email}
                      onChange={(e) => handleEmailChange(idx, e.target.value)}
                    />
                    {row.selected && !row.email.trim() && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block mt-0.5">
                        ⚠️ Preencha o e-mail para que esta unidade receba o demonstrativo.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={enviarEmailMut.isPending || isGeneratingPDF}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleEnviar}
            disabled={
              validSelectedCount === 0 ||
              enviarEmailMut.isPending ||
              isGeneratingPDF
            }
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Send className="h-3.5 w-3.5" />
            {isGeneratingPDF
              ? "Gerando PDF..."
              : enviarEmailMut.isPending
              ? "Enviando e-mails..."
              : `Enviar para ${validSelectedCount} Destinatário(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
