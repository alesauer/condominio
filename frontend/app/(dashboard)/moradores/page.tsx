"use client";

import { useState } from "react";
import Link from "next/link";
import { useMoradores, useDeleteMorador } from "@/services/moradores.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const tipoLabel: Record<string, string> = { morador: "Morador", inquilino: "Inquilino", dependente: "Dependente" };

export default function MoradoresPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");
  const { data, isLoading } = useMoradores({ page, page_size: 10, search: search || undefined, tipo: tipoFilter || undefined });
  const deleteMut = useDeleteMorador();

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir morador?")) return;
    try { await deleteMut.mutateAsync(id); toast.success("Morador excluído"); }
    catch { toast.error("Erro ao excluir"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Moradores</h1><p className="text-muted-foreground">Gerencie os moradores do condomínio</p></div>
        <Link href="/moradores/novo"><Button><Plus className="mr-2 h-4 w-4" /> Novo</Button></Link>
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
            <SelectItem value="morador">Morador</SelectItem>
            <SelectItem value="inquilino">Inquilino</SelectItem>
            <SelectItem value="dependente">Dependente</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50 text-left"><th className="p-3 font-medium">Nome</th><th className="p-3 font-medium">CPF</th><th className="p-3 font-medium">Tipo</th><th className="p-3 font-medium">Telefone</th><th className="p-3 font-medium text-right">Ações</th></tr></thead>
              <tbody>
                {data?.items.map((m) => (
                  <tr key={m.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{m.nome}</td>
                    <td className="p-3">{m.cpf || "-"}</td>
                    <td className="p-3"><Badge variant="outline">{tipoLabel[m.tipo] || m.tipo}</Badge></td>
                    <td className="p-3">{m.telefone || "-"}</td>
                    <td className="p-3 text-right">
                      <Link href={`/moradores/${m.id}`}><Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button></Link>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </td>
                  </tr>
                ))}
                {data?.items.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum morador encontrado</td></tr>}
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
