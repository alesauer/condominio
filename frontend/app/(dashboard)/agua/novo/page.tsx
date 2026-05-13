"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function NovoRateioPage() {
  const router = useRouter();
  const [competencia, setCompetencia] = useState("");
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await api.post("/agua", { competencia, valor_total: Number(valor), observacao: obs || null }); toast.success("Rateio criado"); router.push("/agua"); }
    catch (err: any) { toast.error(err.response?.data?.detail || "Erro ao criar rateio"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-2"><Link href="/agua"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link><h1 className="text-2xl font-bold">Novo Rateio de Água</h1></div>
      <Card><CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Competência</Label><Input required type="date" value={competencia} onChange={e => setCompetencia(e.target.value)} /></div>
          <div className="space-y-2"><Label>Valor Total (R$)</Label><Input required type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} /></div>
          <div className="space-y-2"><Label>Observação</Label><Input value={obs} onChange={e => setObs(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">O rateio será calculado automaticamente por peso dos apartamentos ocupados/alugados (Padrão=1, Área Privativa=1.5, Cobertura=2).</p>
          <div className="flex gap-2 justify-end"><Link href="/agua"><Button variant="outline" type="button">Cancelar</Button></Link><Button type="submit" disabled={loading}>{loading ? "Calculando..." : "Calcular Rateio"}</Button></div>
        </form>
      </CardContent></Card>
    </div>
  );
}
