"use client"

import { useState, useEffect } from "react"
import api from "@/lib/api"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SortableHeader } from "@/components/ui/sortable-header"
import { useSortableData } from "@/hooks/use-sortable-data"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { CircleAlert, Percent, Settings2, RefreshCw, Save } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { ReadOnlyNotice } from "@/components/auth/admin-gate"

export default function InadimplenciaPage() {
  const { isAdmin } = useAuth()
  const qc = useQueryClient()
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["inadimplencia", "config"],
    queryFn: () => api.get("/inadimplencia/config").then((r) => r.data),
  })
  const { data: atrasadas, isLoading: atrasLoading } = useQuery({
    queryKey: ["inadimplencia", "atrasadas"],
    queryFn: () => api.get("/inadimplencia/cobrancas-atrasadas").then((r) => r.data),
  })
  const [form, setForm] = useState({
    percentual_multa: "2.00",
    percentual_juros_mes: "1.00",
    dias_tolerancia: "5",
  })

  const { items: sortedAtrasadas, sortField, sortDirection, requestSort } = useSortableData(
    atrasadas || [],
    "vencimento",
    "asc"
  )

  useEffect(() => {
    if (config) {
      setForm({
        percentual_multa: String(config.percentual_multa),
        percentual_juros_mes: String(config.percentual_juros_mes),
        dias_tolerancia: String(config.dias_tolerancia),
      })
    }
  }, [config])

  const saveConfig = async () => {
    try {
      await api.put("/inadimplencia/config", {
        percentual_multa: Number(form.percentual_multa),
        percentual_juros_mes: Number(form.percentual_juros_mes),
        dias_tolerancia: Number(form.dias_tolerancia),
      })
      qc.invalidateQueries({ queryKey: ["inadimplencia"] })
      toast.success("Configuração de encargos salva com sucesso!")
    } catch {
      toast.error("Erro ao salvar configuração")
    }
  }

  const recalcular = async () => {
    try {
      await api.post("/inadimplencia/recalcular")
      qc.invalidateQueries({ queryKey: ["inadimplencia"] })
      toast.success("Multas e juros recalculados com sucesso!")
    } catch {
      toast.error("Erro ao recalcular juros")
    }
  }

  return (
    <div className="space-y-6">
      <ReadOnlyNotice />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Gestão de Inadimplência
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configuração de encargos moratórios e acompanhamento de cobranças em atraso
          </p>
        </div>
      </div>

      {/* Config Card */}
      {configLoading ? (
        <Skeleton className="h-44 w-full rounded-xl" />
      ) : (
        <Card className="border border-slate-200 shadow-card bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Settings2 className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Parâmetros de Multa e Juros por Atraso
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {isAdmin 
                    ? "Defina os encargos aplicados automaticamente após o vencimento"
                    : "Encargos vigentes aplicados aos vencimentos em atraso"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Multa Moratória (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  disabled={!isAdmin}
                  value={form.percentual_multa}
                  onChange={(e) => setForm({ ...form, percentual_multa: e.target.value })}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Juros ao Mês (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  disabled={!isAdmin}
                  value={form.percentual_juros_mes}
                  onChange={(e) => setForm({ ...form, percentual_juros_mes: e.target.value })}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Dias de Tolerância</Label>
                <Input
                  type="number"
                  disabled={!isAdmin}
                  value={form.dias_tolerancia}
                  onChange={(e) => setForm({ ...form, dias_tolerancia: e.target.value })}
                  className="bg-white"
                />
              </div>
            </div>

            {isAdmin && (
              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={saveConfig} className="gap-2 shadow-xs">
                  <Save className="h-4 w-4" />
                  <span>Salvar Configuração</span>
                </Button>
                <Button variant="secondary" onClick={recalcular} className="gap-2">
                  <RefreshCw className="h-4 w-4 text-slate-600" />
                  <span>Recalcular Multas e Juros</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delinquent Units Table */}
      {atrasLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                <SortableHeader field="descricao" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                  Descrição
                </SortableHeader>
                <SortableHeader field="vencimento" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                  Vencimento
                </SortableHeader>
                <SortableHeader field="valor" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                  Valor Original
                </SortableHeader>
                <SortableHeader field="multa" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                  Multa
                </SortableHeader>
                <SortableHeader field="juros" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                  Juros
                </SortableHeader>
                <SortableHeader field="valor_total" currentField={sortField} direction={sortDirection} onSort={requestSort} align="right">
                  Total Atualizado
                </SortableHeader>
                <SortableHeader field="status" currentField={sortField} direction={sortDirection} onSort={requestSort} align="center">
                  Status
                </SortableHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedAtrasadas.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-slate-900">{c.descricao}</td>
                  <td className="px-4 py-3.5 text-slate-600 font-mono text-xs">{formatDate(c.vencimento)}</td>
                  <td className="px-4 py-3.5 text-right text-slate-700 font-medium">{formatCurrency(c.valor)}</td>
                  <td className="px-4 py-3.5 text-right text-amber-600 font-medium">{formatCurrency(c.multa || 0)}</td>
                  <td className="px-4 py-3.5 text-right text-amber-600 font-medium">{formatCurrency(c.juros || 0)}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-rose-600">{formatCurrency(c.valor_total)}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="status-pill status-pill-atrasado">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      <span>{c.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
              {sortedAtrasadas.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-slate-400">
                    Parabéns! Nenhuma cobrança em atraso encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
