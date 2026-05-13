"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";

export default function RelatoriosPage() {
  const [tipo, setTipo] = useState("balancete");
  const [mes, setMes] = useState(String(new Date().getMonth() + 1));
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [formato, setFormato] = useState("excel");

  const gerar = () => {
    const url = `/api/v1/relatorios/${tipo}?mes=${mes}&ano=${ano}&formato=${formato}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div><h1 className="text-2xl font-bold">Relatórios</h1><p className="text-muted-foreground">Gere relatórios em PDF ou Excel</p></div>
      <Card><CardHeader><CardTitle>Gerar Relatório</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="space-y-2"><Label>Tipo</Label><Select value={tipo} onValueChange={setTipo}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="balancete">Balancete</SelectItem></SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Mês</Label><Select value={mes} onValueChange={setMes}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[...Array(12)].map((_, i) => <SelectItem key={i+1} value={String(i+1)}>{String(i+1).padStart(2,'0')}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Ano</Label><Select value={ano} onValueChange={setAno}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[...Array(5)].map((_, i) => { const y = new Date().getFullYear() - i; return <SelectItem key={y} value={String(y)}>{y}</SelectItem>; })}</SelectContent></Select></div>
        </div>
        <div className="space-y-2"><Label>Formato</Label><Select value={formato} onValueChange={setFormato}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="excel">Excel (.xlsx)</SelectItem><SelectItem value="pdf">PDF</SelectItem></SelectContent></Select></div>
        <Button className="w-full" onClick={gerar}><Download className="mr-2 h-4 w-4" /> Gerar Relatório</Button>
      </CardContent></Card>
    </div>
  );
}
