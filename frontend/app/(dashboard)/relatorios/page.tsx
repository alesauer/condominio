"use client";

import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RelatoriosPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [tipo, setTipo] = useState("balancete");
  const [mes, setMes] = useState(String(currentMonth));
  const [ano, setAno] = useState(String(currentYear));
  const [formato, setFormato] = useState("pdf");
  const [loading, setLoading] = useState(false);

  const handleGerar = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/relatorios/${tipo}`, {
        params: { mes, ano, formato },
        responseType: "blob",
      });

      const ext = formato === "excel" ? "xlsx" : "pdf";
      const filename = `relatorio_${tipo}_${mes.padStart(2, "0")}_${ano}.${ext}`;
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Relatório gerado e baixado com sucesso!");
    } catch {
      toast.error("Erro ao gerar relatório.");
    } finally {
      setLoading(false);
    }
  };

  const meses = [
    { num: "1", nome: "01 - Janeiro" },
    { num: "2", nome: "02 - Fevereiro" },
    { num: "3", nome: "03 - Março" },
    { num: "4", nome: "04 - Abril" },
    { num: "5", nome: "05 - Maio" },
    { num: "6", nome: "06 - Junho" },
    { num: "7", nome: "07 - Julho" },
    { num: "8", nome: "08 - Agosto" },
    { num: "9", nome: "09 - Setembro" },
    { num: "10", nome: "10 - Outubro" },
    { num: "11", nome: "11 - Novembro" },
    { num: "12", nome: "12 - Dezembro" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios Financeiros</h1>
        <p className="text-muted-foreground">
          Emita balancetes e demonstrativos analíticos em PDF ou Excel
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Demonstrativo de Balancete</CardTitle>
          <CardDescription>
            Consolida todas as receitas e despesas lançadas no período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="tipo">Modelo de Relatório</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balancete">Balancete Mensal Analítico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mes">Mês de Competência</Label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger id="mes">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((m) => (
                    <SelectItem key={m.num} value={m.num}>
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ano">Ano</Label>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger id="ano">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(5)].map((_, i) => {
                    const y = String(currentYear - i);
                    return (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="formato">Formato de Exportação</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormato("pdf")}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  formato === "pdf"
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary font-medium"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <FileText className="h-5 w-5 text-rose-500 shrink-0" />
                <div>
                  <div className="text-sm font-semibold">Documento PDF</div>
                  <div className="text-xs text-muted-foreground">Pronto para impressão</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormato("excel")}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  formato === "excel"
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary font-medium"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-sm font-semibold">Planilha Excel</div>
                  <div className="text-xs text-muted-foreground">Arquivo .xlsx</div>
                </div>
              </button>
            </div>
          </div>

          <Button
            className="w-full h-11 text-base mt-2"
            onClick={handleGerar}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Gerando Relatório...
              </>
            ) : (
              <>
                <Download className="mr-2 h-5 w-5" /> Exportar Balancete
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
