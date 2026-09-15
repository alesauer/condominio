"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateReceita } from "@/services/receitas.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Repeat, Info } from "lucide-react";
import { AdminGate, RestrictedPageNotice } from "@/components/auth/admin-gate";

export default function NovaReceitaPage() {
  const router = useRouter();
  const createMut = useCreateReceita();
  const [form, setForm] = useState({
    descricao: "",
    tipo: "condominio",
    valor: "",
    competencia: "",
    status: "pendente",
    categoria: "",
    observacao: "",
    recorrente: false,
    meses_recorrencia: "12",
  });

  const recurrenceSummary = useMemo(() => {
    if (!form.recorrente || !form.competencia || !form.valor) return null;
    const meses = parseInt(form.meses_recorrencia, 10) || 1;
    if (meses <= 1) return null;
    const val = Number(form.valor) || 0;
    return `Serão gerados ${meses} lançamentos mensais de ${formatCurrency(val)} cada (Total: ${formatCurrency(val * meses)}).`;
  }, [form.recorrente, form.competencia, form.valor, form.meses_recorrencia]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const meses = form.recorrente ? parseInt(form.meses_recorrencia, 10) : null;
      await createMut.mutateAsync({
        descricao: form.descricao,
        tipo: form.tipo as any,
        valor: Number(form.valor),
        competencia: form.competencia,
        status: form.status as any,
        categoria: form.categoria || null,
        observacao: form.observacao || null,
        vencimento: null,
        data_recebimento: null,
        apartamento_id: null,
        recorrente: form.recorrente,
        meses_recorrencia: meses,
      });
      toast.success(
        form.recorrente && meses && meses > 1
          ? `${meses} receitas recorrentes criadas com sucesso!`
          : "Receita criada com sucesso!"
      );
      router.push("/financeiro/receitas");
    } catch {
      toast.error("Erro ao criar receita");
    }
  };

  return (
    <AdminGate fallback={<RestrictedPageNotice backHref="/financeiro/receitas" backLabel="Voltar para Receitas" />}>
      <div className="max-w-xl space-y-4">
        <div className="flex items-center gap-2">
        <Link href="/financeiro/receitas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nova Receita</h1>
          <p className="text-xs text-muted-foreground">Cadastre receitas pontuais ou recorrentes para o condomínio</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                required
                placeholder="Ex: Taxa de Condomínio, Aluguel Salão..."
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="condominio">Condomínio</SelectItem>
                    <SelectItem value="fundo_reserva">Fundo Reserva</SelectItem>
                    <SelectItem value="taxa_extra">Taxa Extra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor Unitário (R$)</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Competência Inicial</Label>
                <Input
                  required
                  type="date"
                  value={form.competencia}
                  onChange={(e) => setForm({ ...form, competencia: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status Inicial</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Recorrência */}
            <div className="rounded-lg border p-4 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-primary" />
                  <div>
                    <Label className="font-semibold cursor-pointer">Lançamento Recorrente</Label>
                    <p className="text-xs text-muted-foreground">Repetir automaticamente este valor por vários meses</p>
                  </div>
                </div>
                <Switch
                  checked={form.recorrente}
                  onCheckedChange={(v) => setForm({ ...form, recorrente: v })}
                />
              </div>

              {form.recorrente && (
                <div className="pt-2 border-t space-y-3 animate-in fade-in-50 duration-200">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label className="text-xs font-medium">Quantidade de Meses a Gerar:</Label>
                      <Select
                        value={form.meses_recorrencia}
                        onValueChange={(v) => setForm({ ...form, meses_recorrencia: v })}
                      >
                        <SelectTrigger className="h-9 mt-1">
                          <SelectValue placeholder="Selecione o período" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 meses</SelectItem>
                          <SelectItem value="3">3 meses</SelectItem>
                          <SelectItem value="6">6 meses (Semestral)</SelectItem>
                          <SelectItem value="12">12 meses (1 ano)</SelectItem>
                          <SelectItem value="24">24 meses (2 anos)</SelectItem>
                          <SelectItem value="36">36 meses (3 anos)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Label className="text-xs font-medium">Ou manual:</Label>
                      <Input
                        type="number"
                        min="2"
                        max="60"
                        className="h-9 mt-1"
                        value={form.meses_recorrencia}
                        onChange={(e) => setForm({ ...form, meses_recorrencia: e.target.value })}
                      />
                    </div>
                  </div>

                  {recurrenceSummary && (
                    <div className="flex items-start gap-2 p-2.5 rounded bg-primary/10 text-primary text-xs">
                      <Info className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{recurrenceSummary}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Categoria (Opcional)</Label>
              <Input
                placeholder="Ex: Mensalidades, Garagem, Salão..."
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Observação (Opcional)</Label>
              <Input
                placeholder="Informações adicionais..."
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Link href="/financeiro/receitas">
                <Button variant="outline" type="button">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={createMut.isPending}>
                {form.recorrente ? "Salvar Receitas Recorrentes" : "Salvar Receita"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
    </AdminGate>
  );
}
