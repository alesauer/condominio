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
import { useQuery } from "@tanstack/react-query";
import type { Apartamento } from "@/types/apartamento";
import type { PaginatedResponse } from "@/types";

export default function NovaLeituraPage() {
  const router = useRouter();
  const [aptoId, setAptoId] = useState("");
  const [competencia, setCompetencia] = useState("");
  const [leituraAtual, setLeituraAtual] = useState("");
  const [leituraAnterior, setLeituraAnterior] = useState("");
  const [valorUnitario, setValorUnitario] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: aptos } = useQuery({ queryKey: ["apartamentos", "all"], queryFn: () => api.get<PaginatedResponse<Apartamento>>("/apartamentos?page_size=100").then(r => r.data) });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await api.post("/gas", { apartamento_id: aptoId, competencia, leitura_atual: Number(leituraAtual), leitura_anterior: leituraAnterior ? Number(leituraAnterior) : undefined, valor_unitario: valorUnitario ? Number(valorUnitario) : undefined }); toast.success("Leitura registrada"); router.push("/gas"); }
    catch (err: any) { toast.error(err.response?.data?.detail || "Erro"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-2"><Link href="/gas"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link><h1 className="text-2xl font-bold">Nova Leitura de Gás</h1></div>
      <Card><CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Apartamento</Label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required value={aptoId} onChange={e => setAptoId(e.target.value)}><option value="">Selecione...</option>{aptos?.items.map(a => <option key={a.id} value={a.id}>{a.numero}{a.bloco ? ` - Bloco ${a.bloco}` : ""}</option>)}</select></div>
          <div className="space-y-2"><Label>Competência</Label><Input required type="date" value={competencia} onChange={e => setCompetencia(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Leitura Anterior (opcional)</Label><Input type="number" step="0.01" value={leituraAnterior} onChange={e => setLeituraAnterior(e.target.value)} /></div>
            <div className="space-y-2"><Label>Leitura Atual</Label><Input required type="number" step="0.01" value={leituraAtual} onChange={e => setLeituraAtual(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Valor Unitário (R$/m³)</Label><Input type="number" step="0.0001" value={valorUnitario} onChange={e => setValorUnitario(e.target.value)} /></div>
          <div className="flex gap-2 justify-end"><Link href="/gas"><Button variant="outline" type="button">Cancelar</Button></Link><Button type="submit" disabled={loading}>Salvar</Button></div>
        </form>
      </CardContent></Card>
    </div>
  );
}
