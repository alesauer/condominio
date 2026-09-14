"use client"

import { useState } from "react"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Download, FileSpreadsheet, FileText, Loader2, ChartNoAxesCombined } from "lucide-react"
import { toast } from "sonner"

export default function RelatoriosPage() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [tipo, setTipo] = useState("balancete")
  const [mes, setMes] = useState(String(currentMonth))
  const [ano, setAno] = useState(String(currentYear))
  const [formato, setFormato] = useState("pdf")
  const [loading, setLoading] = useState(false)

  const handleGerar = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/relatorios/${tipo}`, {
        params: { mes, ano, formato },
        responseType: "blob",
      })

      const ext = formato === "excel" ? "xlsx" : "pdf"
      const filename = `relatorio_${tipo}_${mes.padStart(2, "0")}_${ano}.${ext}`
      const blob = new Blob([res.data])
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success("Relatório gerado e baixado com sucesso!")
    } catch {
      toast.error("Erro ao gerar relatório.")
    } finally {
      setLoading(false)
    }
  }

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
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="pb-2 border-b border-slate-200/60">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Relatórios e Demonstrativos
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Emita balancetes contábeis e prestação de contas analítica em PDF ou Excel
        </p>
      </div>

      <Card className="border border-slate-200 shadow-card bg-white">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
              <ChartNoAxesCombined className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Balancete Mensal Analítico
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Consolidação financeira de receitas, despesas e rateios no período
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="tipo" className="text-xs font-semibold text-slate-700">Modelo de Relatório</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger id="tipo" className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balancete">Balancete Mensal Analítico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="mes" className="text-xs font-semibold text-slate-700">Mês de Competência</Label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger id="mes" className="bg-white">
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

            <div className="space-y-1.5">
              <Label htmlFor="ano" className="text-xs font-semibold text-slate-700">Ano</Label>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger id="ano" className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(5)].map((_, i) => {
                    const y = String(currentYear - i)
                    return (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="formato" className="text-xs font-semibold text-slate-700">Formato do Arquivo</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormato("pdf")}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  formato === "pdf"
                    ? "border-primary-600 bg-primary-50/50 text-slate-900 ring-1 ring-primary-600 font-medium"
                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                <FileText className="h-5 w-5 text-rose-500 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">Documento PDF</div>
                  <div className="text-[11px] text-slate-500">Pronto para impressão</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormato("excel")}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  formato === "excel"
                    ? "border-primary-600 bg-primary-50/50 text-slate-900 ring-1 ring-primary-600 font-medium"
                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">Planilha Excel</div>
                  <div className="text-[11px] text-slate-500">Arquivo .xlsx</div>
                </div>
              </button>
            </div>
          </div>

          <Button
            className="w-full h-11 text-sm mt-2 shadow-xs gap-2"
            onClick={handleGerar}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Gerando Relatório...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Exportar Balancete</span>
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
