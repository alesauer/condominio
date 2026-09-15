"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { CheckCircle2, Upload, FileText, X, Download, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";

interface ItemPagamento {
  id: string;
  descricao: string;
  valor: number;
  competencia: string;
  vencimento?: string | null;
  comprovante_url?: string | null;
  comprovante_nome?: string | null;
  status: string;
}

interface ConfirmarPagamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemPagamento | null;
  tipo: "despesas" | "receitas";
  onSuccess: () => void;
}

export function ConfirmarPagamentoModal({
  isOpen,
  onClose,
  item,
  tipo,
  onSuccess,
}: ConfirmarPagamentoModalProps) {
  const [dataPagamento, setDataPagamento] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDataPagamento(new Date().toISOString().slice(0, 10));
      setFile(null);
    }
  }, [isOpen]);

  if (!item) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDownloadExisting = async () => {
    if (!item.id) return;
    try {
      setDownloading(true);
      const res = await api.get(`/${tipo}/${item.id}/comprovante/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", item.comprovante_nome || `comprovante_${item.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Erro ao baixar comprovante.");
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        if (tipo === "despesas") {
          formData.append("data_pagamento", dataPagamento);
        } else {
          formData.append("data_recebimento", dataPagamento);
        }

        await api.post(`/${tipo}/${item.id}/comprovante`, formData);
      } else {
        const payload: Record<string, any> = {
          status: "pago",
        };
        if (tipo === "despesas") {
          payload.data_pagamento = dataPagamento;
        } else {
          payload.data_recebimento = dataPagamento;
        }
        await api.put(`/${tipo}/${item.id}`, payload);
      }

      toast.success("Pagamento confirmado com sucesso!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Erro ao confirmar pagamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Confirmar Pagamento</DialogTitle>
              <DialogDescription>
                Informe a data de liquidação e anexe o comprovante desta conta
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Card resumo do item */}
        <div className="p-3.5 rounded-lg border bg-muted/30 space-y-1.5 text-sm my-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">{item.descricao}</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(item.valor)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Competência: {formatDate(item.competencia)}</span>
            {item.vencimento && <span>Vencimento: {formatDate(item.vencimento)}</span>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="data_pagamento" className="flex items-center gap-1.5 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Data do Pagamento
            </Label>
            <Input
              id="data_pagamento"
              type="date"
              required
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Comprovante de Pagamento</Label>
            
            {/* Se já existe comprovante salvo */}
            {item.comprovante_url && !file && (
              <div className="flex items-center justify-between p-2.5 rounded-md border bg-muted/40 text-xs mb-2">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate font-medium">
                    {item.comprovante_nome || "Comprovante anexado"}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary"
                  onClick={handleDownloadExisting}
                  disabled={downloading}
                >
                  {downloading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Download className="h-3 w-3 mr-1" />}
                  Baixar
                </Button>
              </div>
            )}

            {/* Se novo arquivo selecionado */}
            {file ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5 text-sm">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="truncate">
                    <p className="font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => setFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border-muted-foreground/30">
                <Upload className="h-6 w-6 text-muted-foreground mb-1.5" />
                <span className="text-sm font-medium text-foreground">
                  {item.comprovante_url ? "Substituir comprovante" : "Clique para anexar comprovante"}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  PDF, PNG, JPG ou JPEG (máx. 10MB)
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {file ? "Pagar e Enviar Comprovante" : "Confirmar como Pago"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
