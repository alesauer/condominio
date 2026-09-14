"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import {
  usePlanilhaGas,
  useSalvarLoteGas,
  type LeituraGasPlanilhaItem,
} from "@/services/gas.service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import {
  Flame,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Save,
  RotateCcw,
  Building2,
  CheckCircle2,
  Sparkles,
  Layers,
  HelpCircle,
} from "lucide-react"
import { toast } from "sonner"

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

function parseNumber(value: any): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return isNaN(value) ? 0 : value
  const str = String(value).trim().replace(",", ".")
  if (str === "") return 0
  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}

interface RowState {
  apartamento_id: string
  apartamento_numero: string
  apartamento_bloco?: string | null
  leitura_anterior: string
  leitura_atual: string
  valor_unitario: string
  observacao: string
  leitura_id?: string | null
  isDirty?: boolean
}

export default function GasPage() {
  const today = new Date()
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1)

  const competenciaParam = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`

  const handlePrevMonth = () => {
    setHasUnsavedChanges(false)
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear((y) => y - 1)
    } else {
      setSelectedMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    setHasUnsavedChanges(false)
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear((y) => y + 1)
    } else {
      setSelectedMonth((m) => m + 1)
    }
  }

  const { data: planilhaData, isLoading, refetch } = usePlanilhaGas(competenciaParam)
  const salvarMut = useSalvarLoteGas()

  const [valorUnitarioPadrao, setValorUnitarioPadrao] = useState("19.95")
  const [rows, setRows] = useState<RowState[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    if (planilhaData && !hasUnsavedChanges) {
      const defaultUnit = planilhaData.valor_unitario_padrao || 19.95
      setValorUnitarioPadrao(String(defaultUnit))

      const newRows: RowState[] = planilhaData.itens.map((item) => ({
        apartamento_id: item.apartamento_id,
        apartamento_numero: item.apartamento_numero,
        apartamento_bloco: item.apartamento_bloco,
        leitura_anterior: item.leitura_anterior != null ? String(item.leitura_anterior) : "0",
        leitura_atual: item.leitura_atual != null ? String(item.leitura_atual) : "",
        valor_unitario: item.valor_unitario != null ? String(item.valor_unitario) : String(defaultUnit),
        observacao: item.observacao || "",
        leitura_id: item.leitura_id,
        isDirty: false,
      }))

      setRows(newRows)
    }
  }, [planilhaData, hasUnsavedChanges])

  const handleCellChange = (
    index: number,
    field: "leitura_anterior" | "leitura_atual" | "valor_unitario" | "observacao",
    value: string
  ) => {
    setRows((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        [field]: value,
        isDirty: true,
      }
      return next
    })
    setHasUnsavedChanges(true)
  }

  const handleValorUnitarioPadraoChange = (newVal: string) => {
    setValorUnitarioPadrao(newVal)
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        valor_unitario: newVal,
        isDirty: true,
      }))
    )
    setHasUnsavedChanges(true)
  }

  const handlePreencherSemConsumo = () => {
    setRows((prev) =>
      prev.map((r) => {
        if (!r.leitura_atual.trim() && r.leitura_anterior) {
          return {
            ...r,
            leitura_atual: r.leitura_anterior,
            isDirty: true,
          }
        }
        return r
      })
    )
    setHasUnsavedChanges(true)
    toast.info("Leituras anteriores replicadas como leitura atual para apartamentos sem alteração.")
  }

  const calculatedRows = useMemo(() => {
    let totalConsumo = 0
    let totalValor = 0
    let preenchidosCount = 0

    const unitPadrao = parseNumber(valorUnitarioPadrao) || 19.95

    const items = rows.map((r) => {
      const ant = parseNumber(r.leitura_anterior)
      const rawAtual = String(r.leitura_atual ?? "").trim()
      const hasAtual = rawAtual !== ""
      const atual = parseNumber(rawAtual)
      const unit = parseNumber(r.valor_unitario) || unitPadrao

      let consumo = 0
      let valorCobrado = 0

      if (hasAtual) {
        consumo = Math.max(0, atual - ant)
        valorCobrado = Math.round(consumo * unit * 100) / 100
        preenchidosCount++
      }

      totalConsumo += consumo
      totalValor += valorCobrado

      return {
        ...r,
        consumoCalculado: consumo,
        valorCobradoCalculado: valorCobrado,
        hasAtual,
      }
    })

    return {
      items,
      totalConsumo: Math.round(totalConsumo * 100) / 100,
      totalValor: Math.round(totalValor * 100) / 100,
      preenchidosCount,
      totalAptos: rows.length,
    }
  }, [rows, valorUnitarioPadrao])

  const handleSalvar = async () => {
    try {
      const payload = {
        competencia: competenciaParam,
        valor_unitario_padrao: parseNumber(valorUnitarioPadrao) || 19.95,
        leituras: rows
          .filter((r) => String(r.leitura_atual ?? "").trim() !== "")
          .map((r) => {
            const ant = parseNumber(r.leitura_anterior)
            const atual = parseNumber(r.leitura_atual)
            const unit = parseNumber(r.valor_unitario) || parseNumber(valorUnitarioPadrao) || 19.95
            return {
              apartamento_id: r.apartamento_id,
              leitura_anterior: ant,
              leitura_atual: atual,
              valor_unitario: unit,
              observacao: r.observacao?.trim() || undefined,
            }
          }),
      }

      await salvarMut.mutateAsync(payload)
      toast.success("Leituras de gás salvas com sucesso!")
      setHasUnsavedChanges(false)
      refetch()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Erro ao salvar leituras de gás.")
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        handleSalvar()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [rows, valorUnitarioPadrao, competenciaParam])

  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  const handleKeyDownInput = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    field: "anterior" | "atual"
  ) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault()
      const nextIndex = index + 1
      const target = inputRefs.current[`${field}-${nextIndex}`]
      if (target) {
        target.focus()
        target.select()
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const prevIndex = index - 1
      const target = inputRefs.current[`${field}-${prevIndex}`]
      if (target) {
        target.focus()
        target.select()
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Consumo e Leituras de Gás
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Planilha interativa de medição por apartamento com cálculo em tempo real
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Competência (Mês / Ano) */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-600 hover:text-slate-900"
              onClick={handlePrevMonth}
              title="Mês Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1.5 px-3">
              <Calendar className="h-3.5 w-3.5 text-primary-600" />
              <span className="font-semibold text-xs sm:text-sm text-slate-800 whitespace-nowrap">
                {MESES[selectedMonth - 1]} de {selectedYear}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-600 hover:text-slate-900"
              onClick={handleNextMonth}
              title="Próximo Mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Botão Salvar */}
          <Button
            onClick={handleSalvar}
            disabled={salvarMut.isPending}
            className={`gap-2 shadow-xs ${
              hasUnsavedChanges
                ? "bg-amber-600 hover:bg-amber-700 text-white animate-pulse"
                : ""
            }`}
          >
            <Save className="h-4 w-4" />
            <span>{salvarMut.isPending ? "Salvando..." : "Salvar Leituras"}</span>
            {hasUnsavedChanges && (
              <span className="ml-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">
                Ctrl+S
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Unit Price */}
        <Card className="border border-slate-200 shadow-card bg-white">
          <CardContent className="p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Preço do m³
              </span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                Tarifa GLP
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-sm font-bold text-slate-500">R$</span>
              <Input
                type="text"
                inputMode="decimal"
                className="h-9 text-base font-bold bg-white text-slate-900"
                value={valorUnitarioPadrao}
                onChange={(e) => {
                  const val = e.target.value
                  if (/^[0-9.,]*$/.test(val)) {
                    handleValorUnitarioPadraoChange(val)
                  }
                }}
                placeholder="19.95"
              />
            </div>
          </CardContent>
        </Card>

        {/* Consumo Total */}
        <Card className="border border-slate-200 shadow-card bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Consumo Total</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold text-amber-600">
                  {calculatedRows.totalConsumo.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-bold text-amber-600">m³</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Medição do mês</p>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Flame className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total a Cobrar */}
        <Card className="border border-slate-200 shadow-card bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total a Cobrar</p>
              <h3 className="text-2xl font-bold text-primary-600 mt-1">
                {formatCurrency(calculatedRows.totalValor)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Rateio apurado</p>
            </div>
            <div className="p-2.5 bg-primary-50 text-primary-600 rounded-lg">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Preenchimento */}
        <Card className="border border-slate-200 shadow-card bg-white">
          <CardContent className="p-4 flex flex-col justify-between space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lançamentos</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  hasUnsavedChanges
                    ? "text-amber-700 bg-amber-50 border border-amber-200"
                    : "text-emerald-700 bg-emerald-50 border border-emerald-200"
                }`}
              >
                {hasUnsavedChanges ? "Não salvo" : "Sincronizado"}
              </span>
            </div>
            <div className="text-sm font-bold text-slate-900 pt-1">
              {calculatedRows.preenchidosCount} de {calculatedRows.totalAptos} preenchidos
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePreencherSemConsumo}
              className="h-7 text-[11px] px-2 text-slate-500 hover:text-slate-900 justify-start"
              title="Preenche Leitura Atual igual à Leitura Anterior para os apartamentos vazios"
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Replicar sem consumo
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Spreadsheet Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 text-left">Apartamento</th>
                  <th className="py-3 px-3 text-center">Competência</th>
                  <th className="py-3 px-3 text-right w-36">Leitura Ant. (m³)</th>
                  <th className="py-3 px-3 text-right w-40">Leitura Atual (m³)</th>
                  <th className="py-3 px-3 text-right w-32">Consumo</th>
                  <th className="py-3 px-3 text-right w-32">Valor (R$/m³)</th>
                  <th className="py-3 px-4 text-right w-36">Total Cobrado</th>
                  <th className="py-3 px-3 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calculatedRows.items.map((row, idx) => {
                  const hasConsumo = row.consumoCalculado > 0
                  const isFilled = row.hasAtual

                  return (
                    <tr
                      key={row.apartamento_id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        hasConsumo ? "bg-amber-50/20" : ""
                      }`}
                    >
                      <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center text-xs font-bold text-primary-600 border border-slate-200">
                            {row.apartamento_numero}
                          </div>
                          <div>
                            <span className="font-bold">Apto {row.apartamento_numero}</span>
                            {row.apartamento_bloco && (
                              <span className="text-xs text-slate-500 ml-1">
                                ({row.apartamento_bloco})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center text-xs text-slate-500 whitespace-nowrap">
                        {String(selectedMonth).padStart(2, "0")}/{selectedYear}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <Input
                          ref={(el) => { inputRefs.current[`anterior-${idx}`] = el }}
                          type="text"
                          inputMode="decimal"
                          className="h-8 text-right text-xs font-mono font-medium bg-slate-50 border-slate-200"
                          value={row.leitura_anterior}
                          onChange={(e) => {
                            const val = e.target.value
                            if (/^[0-9.,]*$/.test(val)) {
                              handleCellChange(idx, "leitura_anterior", val)
                            }
                          }}
                          onKeyDown={(e) => handleKeyDownInput(e, idx, "anterior")}
                          placeholder="0"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <Input
                          ref={(el) => { inputRefs.current[`atual-${idx}`] = el }}
                          type="text"
                          inputMode="decimal"
                          className={`h-8 text-right text-xs font-mono font-bold bg-white ${
                            isFilled
                              ? "border-primary-400 text-slate-900"
                              : "border-dashed border-slate-300 text-slate-400"
                          }`}
                          value={row.leitura_atual}
                          onChange={(e) => {
                            const val = e.target.value
                            if (/^[0-9.,]*$/.test(val)) {
                              handleCellChange(idx, "leitura_atual", val)
                            }
                          }}
                          onKeyDown={(e) => handleKeyDownInput(e, idx, "atual")}
                          placeholder="Leitura..."
                          autoFocus={idx === 0}
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {isFilled ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs ${
                              hasConsumo
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "text-slate-400"
                            }`}
                          >
                            {row.consumoCalculado.toLocaleString("pt-BR", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}{" "}
                            m³
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <span className="text-xs text-slate-600 font-mono">
                          {formatCurrency(parseNumber(row.valor_unitario) || parseNumber(valorUnitarioPadrao) || 19.95)}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        {isFilled ? (
                          <span
                            className={`font-mono text-sm ${
                              hasConsumo
                                ? "font-bold text-emerald-600"
                                : "font-medium text-slate-400"
                            }`}
                          >
                            {formatCurrency(row.valorCobradoCalculado)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">R$ 0,00</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {row.isDirty ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                            Editado
                          </span>
                        ) : isFilled ? (
                          <span className="inline-flex items-center text-[11px] text-emerald-600 gap-1 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Salvo
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Pendente</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Summary Footer */}
              {calculatedRows.items.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50/90 font-semibold text-xs text-slate-800">
                    <td className="py-3 px-4 font-bold text-slate-900" colSpan={4}>
                      <div className="flex items-center justify-between">
                        <span>TOTAL GERAL ({calculatedRows.totalAptos} Apartamentos)</span>
                        <span className="text-slate-500 font-normal">Soma das medições apuradas:</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-mono font-bold text-amber-600 text-sm">
                        {calculatedRows.totalConsumo.toLocaleString("pt-BR", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}{" "}
                        m³
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400">—</td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-extrabold text-primary-600 text-base">
                        {formatCurrency(calculatedRows.totalValor)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Button
                        size="sm"
                        onClick={handleSalvar}
                        disabled={salvarMut.isPending}
                        className="h-7 text-xs px-2.5 gap-1"
                      >
                        <Save className="h-3 w-3" /> Salvar
                      </Button>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Productivity Helper Tip */}
      <div className="flex items-start gap-2.5 text-xs text-slate-600 p-3.5 rounded-lg border border-slate-200 bg-white shadow-card">
        <HelpCircle className="h-4 w-4 text-primary-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900">Dica de Produtividade: </span>
          Digite a Leitura Atual e pressione <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono text-slate-700">Enter</kbd> ou <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono text-slate-700">↓ Seta para Baixo</kbd> para navegar na planilha. Pressione <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono text-slate-700">Ctrl + S</kbd> a qualquer momento para salvar.
        </div>
      </div>
    </div>
  )
}
