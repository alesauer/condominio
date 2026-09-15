"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  FileText,
  Paperclip,
  UploadCloud,
  Plus,
  Trash2,
  X,
  FileCheck,
  CheckCircle2,
  Loader2,
} from "lucide-react"

interface PautaItem {
  ordem: number
  descricao: string
}

export default function NovaAssembleiaPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    data: "",
    titulo: "",
    descricao: "",
    local: "",
    hora_inicio: "",
    hora_fim: "",
    ata_conteudo: "",
  })

  const [pautas, setPautas] = useState<PautaItem[]>([
    { ordem: 1, descricao: "" },
  ])

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAddPauta = () => {
    setPautas((prev) => [...prev, { ordem: prev.length + 1, descricao: "" }])
  }

  const handleRemovePauta = (index: number) => {
    if (pautas.length <= 1) {
      setPautas([{ ordem: 1, descricao: "" }])
      return
    }
    const filtered = pautas.filter((_, i) => i !== index)
    const reordered = filtered.map((p, i) => ({ ...p, ordem: i + 1 }))
    setPautas(reordered)
  }

  const handlePautaChange = (index: number, value: string) => {
    const updated = [...pautas]
    updated[index].descricao = value
    setPautas(updated)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo.trim()) {
      toast.error("Por favor, preencha o título da assembleia.")
      return
    }
    if (!form.data) {
      toast.error("Por favor, selecione a data da assembleia.")
      return
    }

    setLoading(true)
    try {
      // 1. Filtra pautas válidas
      const validPautas = pautas
        .filter((p) => p.descricao.trim().length > 0)
        .map((p, idx) => ({ ordem: idx + 1, descricao: p.descricao.trim() }))

      // 2. Cria a assembleia
      const payload = {
        titulo: form.titulo.trim(),
        data: form.data,
        descricao: form.descricao.trim() || null,
        local: form.local.trim() || null,
        hora_inicio: form.hora_inicio || null,
        hora_fim: form.hora_fim || null,
        pautas: validPautas,
        ata_conteudo: form.ata_conteudo.trim() || null,
      }

      const res = await api.post("/assembleias", payload)
      const assembleiaId = res.data.id

      // 3. Se houver arquivo anexo de ata, faz o upload
      if (selectedFile) {
        const formData = new FormData()
        formData.append("file", selectedFile)
        if (form.ata_conteudo.trim()) {
          formData.append("conteudo", form.ata_conteudo.trim())
        }

        await api.post(`/assembleias/${assembleiaId}/ata`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      }

      toast.success("Assembleia criada com sucesso!")
      router.push("/assembleias")
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Erro ao criar assembleia. Tente novamente."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <Link href="/assembleias">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nova Assembleia</h1>
            <p className="text-sm text-slate-500">Cadastre uma reunião, defina pautas e anexe a ata com documentos</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Principais */}
        <Card className="border border-slate-200/80 bg-white shadow-card">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-primary-600">
              <CalendarDays className="h-5 w-5" />
              <CardTitle className="text-base font-semibold text-slate-900">Informações da Assembleia</CardTitle>
            </div>
            <CardDescription>Dados essenciais para convocação e registro da assembleia.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo" className="text-slate-700 font-medium">
                Título da Assembleia <span className="text-red-500">*</span>
              </Label>
              <Input
                id="titulo"
                required
                placeholder="Ex: Assembleia Geral Ordinária - Prestação de Contas 2026"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="bg-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data" className="text-slate-700 font-medium">
                  Data <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="data"
                  required
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora_inicio" className="text-slate-700 font-medium">
                  Horário de Início
                </Label>
                <div className="relative">
                  <Input
                    id="hora_inicio"
                    type="time"
                    value={form.hora_inicio}
                    onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                    className="bg-white pl-9"
                  />
                  <Clock className="h-4 w-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora_fim" className="text-slate-700 font-medium">
                  Horário de Término
                </Label>
                <div className="relative">
                  <Input
                    id="hora_fim"
                    type="time"
                    value={form.hora_fim}
                    onChange={(e) => setForm({ ...form, hora_fim: e.target.value })}
                    className="bg-white pl-9"
                  />
                  <Clock className="h-4 w-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="local" className="text-slate-700 font-medium">
                Local da Realização
              </Label>
              <div className="relative">
                <Input
                  id="local"
                  placeholder="Ex: Salão de Festas do Condomínio / Online via Google Meet"
                  value={form.local}
                  onChange={(e) => setForm({ ...form, local: e.target.value })}
                  className="bg-white pl-9"
                />
                <MapPin className="h-4 w-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao" className="text-slate-700 font-medium">
                Descrição / Convocação Geral
              </Label>
              <textarea
                id="descricao"
                rows={3}
                placeholder="Detalhes sobre a convocação, quórum mínimo necessário ou orientações gerais para os condôminos..."
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-transparent transition-all"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pautas da Reunião */}
        <Card className="border border-slate-200/80 bg-white shadow-card">
          <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary-600">
                <FileText className="h-5 w-5" />
                <CardTitle className="text-base font-semibold text-slate-900">Pautas da Assembleia</CardTitle>
              </div>
              <CardDescription>Itens e temas que serão debatidos e votados na reunião.</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddPauta}
              className="gap-1.5 text-xs text-primary-600 border-primary-200 hover:bg-primary-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Adicionar Pauta</span>
            </Button>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {pautas.map((pauta, index) => (
              <div key={index} className="flex items-center gap-2.5">
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold shrink-0">
                  {pauta.ordem}º
                </div>
                <Input
                  placeholder={`Descrição do tema da pauta ${pauta.ordem}...`}
                  value={pauta.descricao}
                  onChange={(e) => handlePautaChange(index, e.target.value)}
                  className="bg-white flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemovePauta(index)}
                  className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                  title="Remover pauta"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Ata e Anexos */}
        <Card className="border border-slate-200/80 bg-white shadow-card">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-primary-600">
              <Paperclip className="h-5 w-5" />
              <CardTitle className="text-base font-semibold text-slate-900">Ata e Arquivos da Assembleia</CardTitle>
            </div>
            <CardDescription>
              Anexe o arquivo digitalizado da ata assinada (PDF, DOCX ou Imagem) e/ou registre o texto resumido da ata.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            {/* Upload de Arquivo */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Arquivo da Ata / Documento Anexo</Label>
              
              {!selectedFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-primary-500 bg-primary-50/50"
                      : "border-slate-200 hover:border-primary-400 hover:bg-slate-50/80"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                  />
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center mb-3">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    Clique para selecionar ou arraste o arquivo aqui
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Formatos suportados: PDF, DOCX, Imagens (até 20MB)
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                      <FileCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        {formatFileSize(selectedFile.size)} • Pronto para envio
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Remover anexo"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Conteúdo / Resumo em Texto da Ata */}
            <div className="space-y-2">
              <Label htmlFor="ata_conteudo" className="text-slate-700 font-medium">
                Conteúdo / Resumo em Texto da Ata <span className="text-xs text-slate-400 font-normal">(Opcional)</span>
              </Label>
              <textarea
                id="ata_conteudo"
                rows={4}
                placeholder="Insira as principais deliberações, decisões tomadas, aprovações de contas ou o texto consolidado da ata..."
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-transparent transition-all"
                value={form.ata_conteudo}
                onChange={(e) => setForm({ ...form, ata_conteudo: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/assembleias">
            <Button variant="outline" type="button" disabled={loading}>
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading} className="gap-2 shadow-xs min-w-[140px]">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Salvar Assembleia</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

