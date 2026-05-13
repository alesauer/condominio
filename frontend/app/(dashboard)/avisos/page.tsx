"use client";
import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const prioridadeColor: Record<string, "default" | "secondary" | "outline" | "destructive"> = { baixa: "outline", media: "secondary", alta: "default", urgente: "destructive" };

export default function AvisosPage() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["avisos", page], queryFn: () => api.get(`/avisos?page=${page}&page_size=10`).then(r => r.data) });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Avisos</h1><p className="text-muted-foreground">Comunicados do condomínio</p></div><Link href="/avisos/novo"><Button><Plus className="mr-2 h-4 w-4" /> Novo Aviso</Button></Link></div>
      {isLoading ? <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div> : (
        <div className="space-y-3">
          {data?.items.map((a: any) => (
            <Card key={a.id}><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base">{a.titulo}</CardTitle><div className="flex items-center gap-2"><Badge variant={prioridadeColor[a.prioridade]}>{a.prioridade}</Badge><span className="text-xs text-muted-foreground">{formatDate(a.data_publicacao)}</span><Button variant="ghost" size="icon" onClick={async () => { if (confirm("Excluir?")) { await api.delete(`/avisos/${a.id}`); qc.invalidateQueries({queryKey:["avisos"]}); toast.success("Excluído"); } }}><Trash2 className="h-4 w-4 text-red-500" /></Button></div></div></CardHeader><CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.descricao}</p></CardContent></Card>
          ))}
          {data?.items.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum aviso encontrado</p>}
        </div>
      )}
    </div>
  );
}
