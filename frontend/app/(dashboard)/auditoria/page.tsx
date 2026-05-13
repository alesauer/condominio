"use client";
import { useState } from "react";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

export default function AuditoriaPage() {
  const [page, setPage] = useState(1);
  const [entidade, setEntidade] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["auditoria", page, entidade], queryFn: () => api.get(`/auditoria?page=${page}&page_size=20${entidade ? `&entidade_tipo=${entidade}` : ""}`).then(r => r.data) });

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Auditoria</h1><p className="text-muted-foreground">Registro de todas as alterações no sistema</p></div>
      <Select value={entidade} onValueChange={(v) => { setEntidade(v); setPage(1); }}>
        <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filtrar por entidade" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="apartamentos">Apartamentos</SelectItem>
          <SelectItem value="proprietarios">Proprietários</SelectItem>
          <SelectItem value="moradores">Moradores</SelectItem>
          <SelectItem value="receitas">Receitas</SelectItem>
          <SelectItem value="despesas">Despesas</SelectItem>
          <SelectItem value="cobrancas">Cobranças</SelectItem>
          <SelectItem value="avisos">Avisos</SelectItem>
          <SelectItem value="assembleias">Assembleias</SelectItem>
          <SelectItem value="usuarios">Usuários</SelectItem>
        </SelectContent>
      </Select>
      {isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
        <div className="rounded-md border"><table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50 text-left"><th className="p-3 font-medium">Data</th><th className="p-3 font-medium">Usuário</th><th className="p-3 font-medium">Ação</th><th className="p-3 font-medium">Entidade</th></tr></thead>
          <tbody>
            {data?.items.map((a: any) => (
              <tr key={a.id} className="border-b hover:bg-muted/30"><td className="p-3">{formatDate(a.created_at)}</td><td className="p-3">{a.usuario_nome || "-"}</td><td className="p-3">{a.acao}</td><td className="p-3">{a.entidade_tipo}</td></tr>
            ))}
            {data?.items.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhum registro de auditoria</td></tr>}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
