"use client";

import { useState } from "react";
import Link from "next/link";
import { useProprietarios, useDeleteProprietario } from "@/services/proprietarios.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function ProprietariosPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useProprietarios({ page, page_size: 10, search: search || undefined });
  const deleteMut = useDeleteProprietario();

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir proprietário?")) return;
    try { await deleteMut.mutateAsync(id); toast.success("Proprietário excluído"); }
    catch { toast.error("Erro ao excluir"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proprietários</h1>
          <p className="text-muted-foreground">Gerencie os proprietários</p>
        </div>
        <Link href="/proprietarios/novo"><Button><Plus className="mr-2 h-4 w-4" /> Novo</Button></Link>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar..." className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50 text-left"><th className="p-3 font-medium">Nome</th><th className="p-3 font-medium">CPF</th><th className="p-3 font-medium">Telefone</th><th className="p-3 font-medium">Email</th><th className="p-3 font-medium text-right">Ações</th></tr></thead>
              <tbody>
                {data?.items.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{p.nome}</td>
                    <td className="p-3">{p.cpf}</td>
                    <td className="p-3">{p.telefone || "-"}</td>
                    <td className="p-3">{p.email || "-"}</td>
                    <td className="p-3 text-right">
                      <Link href={`/proprietarios/${p.id}`}><Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button></Link>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </td>
                  </tr>
                ))}
                {data?.items.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum proprietário encontrado</td></tr>}
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
