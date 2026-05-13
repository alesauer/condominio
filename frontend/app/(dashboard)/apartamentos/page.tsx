"use client";

import { useState } from "react";
import Link from "next/link";
import { useApartamentos, useDeleteApartamento } from "@/services/apartamentos.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const tipoLabel: Record<string, string> = {
  padrao: "Padrão",
  area_privativa: "Área Privativa",
  cobertura: "Cobertura",
};

const statusColor: Record<string, "default" | "secondary" | "outline"> = {
  ocupado: "default",
  vazio: "outline",
  alugado: "secondary",
};

export default function ApartamentosPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useApartamentos({ page, page_size: 10, search: search || undefined, tipo: tipoFilter || undefined, status: statusFilter || undefined });
  const deleteMut = useDeleteApartamento();

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir apartamento?")) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Apartamento excluído");
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Apartamentos</h1>
          <p className="text-muted-foreground">Gerencie os apartamentos do condomínio</p>
        </div>
        <Link href="/apartamentos/novo">
          <Button><Plus className="mr-2 h-4 w-4" /> Novo</Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="padrao">Padrão</SelectItem>
            <SelectItem value="area_privativa">Área Privativa</SelectItem>
            <SelectItem value="cobertura">Cobertura</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ocupado">Ocupado</SelectItem>
            <SelectItem value="vazio">Vazio</SelectItem>
            <SelectItem value="alugado">Alugado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="p-3 font-medium">Número</th>
                  <th className="p-3 font-medium">Bloco</th>
                  <th className="p-3 font-medium">Tipo</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((apto) => (
                  <tr key={apto.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{apto.numero}</td>
                    <td className="p-3">{apto.bloco || "-"}</td>
                    <td className="p-3">{tipoLabel[apto.tipo] || apto.tipo}</td>
                    <td className="p-3"><Badge variant={statusColor[apto.status]}>{apto.status}</Badge></td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/apartamentos/${apto.id}`}>
                          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(apto.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data?.items.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum apartamento encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <span className="text-sm text-muted-foreground">Página {page} de {data.total_pages}</span>
              <Button variant="outline" size="sm" disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
