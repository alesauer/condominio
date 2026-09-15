"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import api from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  ArrowLeft,
  Bell,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Send,
  Info,
} from "lucide-react"

export default function NovoAvisoPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [titulo, setTitulo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [prioridade, setPrioridade] = useState("baixa")
  const [enviarEmail, setEnviarEmail] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) {
      toast.error("Por favor, preencha o título do aviso.")
      return
    }
    if (!descricao.trim()) {
      toast.error("Por favor, preencha o conteúdo do aviso.")
      return
    }

    setLoading(true)
    try {
      await api.post("/avisos", {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        prioridade,
        enviar_email: enviarEmail,
      })

      // Invalida o cache de avisos imediatamente
      await queryClient.invalidateQueries({ queryKey: ["avisos"] })
      await queryClient.refetchQueries({ queryKey: ["avisos"] })

      toast.success("Comunicado publicado com sucesso!")
      router.push("/avisos")
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Erro ao publicar comunicado."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const getPriorityInfo = (p: string) => {
    switch (p) {
      case "urgente":
        return { label: "Urgente", desc: "Destacado em vermelho para atenção imediata dos moradores.", color: "text-rose-600 bg-rose-50 border-rose-200" }
      case "alta":
        return { label: "Alta", desc: "Destacado em âmbar para comunicados importantes ou manutenções.", color: "text-amber-600 bg-amber-50 border-amber-200" }
      case "media":
        return { label: "Média", desc: "Informativos de rotina e lembretes gerais do condomínio.", color: "text-primary-600 bg-primary-50 border-primary-200" }
      case "baixa":
      default:
        return { label: "Baixa", desc: "Avisos informativos gerais sem urgência.", color: "text-slate-600 bg-slate-50 border-slate-200" }
    }
  }

  const currentPrio = getPriorityInfo(prioridade)

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-slate-200/60">
        <Link href="/avisos">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Novo Comunicado / Aviso</h1>
          <p className="text-sm text-slate-500">Publique comunicados oficiais no mural e notifique os moradores</p>
        </div>
      </div>

      <Card className="border border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
        <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center gap-2 text-primary-600">
            <Bell className="h-5 w-5" />
            <CardTitle className="text-base font-semibold text-slate-900">Conteúdo do Comunicado</CardTitle>
          </div>
          <CardDescription>
            Defina o assunto, nível de prioridade e mensagem que será exibida a todos os condôminos.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="titulo" className="text-slate-700 font-medium text-sm">
                Título do Comunicado <span className="text-red-500">*</span>
              </Label>
              <Input
                id="titulo"
                required
                placeholder="Ex: Manutenção na rede elétrica - Bloco A"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="bg-white"
              />
            </div>

            {/* Prioridade e Notificação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prioridade" className="text-slate-700 font-medium text-sm">
                  Nível de Prioridade
                </Label>
                <Select value={prioridade} onValueChange={setPrioridade}>
                  <SelectTrigger id="prioridade" className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
                <p className={`text-xs p-2 rounded-lg border ${currentPrio.color}`}>
                  {currentPrio.desc}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium text-sm">Notificação por E-mail</Label>
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={enviarEmail}
                    onChange={(e) => setEnviarEmail(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-primary-600" />
                      <span>Disparar e-mail aos moradores</span>
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Envia uma cópia deste comunicado para os e-mails cadastrados de moradores e proprietários.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Descrição / Conteúdo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="descricao" className="text-slate-700 font-medium text-sm">
                  Mensagem / Descrição Completa <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] text-slate-400">{descricao.length} caracteres</span>
              </div>
              <textarea
                id="descricao"
                rows={6}
                required
                placeholder="Insira todos os detalhes importantes, datas, horários, instruções para os condôminos..."
                className="flex w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-transparent transition-all"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Link href="/avisos">
                <Button variant="outline" type="button" disabled={loading}>
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="gap-2 shadow-xs min-w-[140px] bg-primary-600 hover:bg-primary-700">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Publicando...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Publicar Aviso</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
