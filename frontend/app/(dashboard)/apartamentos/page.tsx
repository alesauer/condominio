"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useApartamentos, useUpdateApartamento, useDeleteApartamento } from "@/services/apartamentos.service";
import { useMoradores } from "@/services/moradores.service";
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
import { SortableHeader } from "@/components/ui/sortable-header";
import { useSortableData } from "@/hooks/use-sortable-data";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Apartamento } from "@/types/apartamento";

const tipoLabel: Record<string, string> = {
  padrao: "Padrão",
  area_privativa: "Área Privativa",
  cobertura: "Cobertura",
};

const statusLabel: Record<string, string> = {
  ocupado: "Ocupado",
  vazio: "Vazio (Livre)",
  alugado: "Alugado",
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "ocupado":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25";
    case "vazio":
      return "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30 hover:bg-slate-500/25";
    case "alugado":
      return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/25";
    default:
      return "bg-muted text-foreground";
  }
};

export default function ApartamentosPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const toApi = (v: string) => (v === "" || v === "all" ? undefined : v);

  const { data, isLoading, refetch } = useApartamentos({ page, page_size: 20, search: search || undefined, tipo: toApi(tipoFilter), status: toApi(statusFilter) });
  const { data: moradoresData } = useMoradores({ page_size: 200 });
  const updateMut = useUpdateApartamento();
  const deleteMut = useDeleteApartamento();

  const proprietarioMap = useMemo(() => {
    const map: Record<string, string> = {};
    moradoresData?.items?.forEach((m) => { map[m.id] = m.nome; });
    return map;
  }, [moradoresData]);

  // Enriquecer itens para ordenação por nome do proprietário
  const formattedItems = useMemo(() => {
    return (data?.items || []).map((apto) => ({
      ...apto,
      proprietario_nome: apto.proprietario_id ? proprietarioMap[apto.proprietario_id] || "" : "",
    }));
  }, [data?.items, proprietarioMap]);

  const { items: sortedApartamentos, sortField, sortDirection, requestSort } = useSortableData(
    formattedItems,
    "numero",
    "asc"
  );

  const handleToggleStatus = async (apto: Apartamento) => {
    const nextStatus = apto.status === "ocupado" ? "vazio" : "ocupado";
    try {
      await updateMut.mutateAsync({
        id: apto.id,
        data: { status: nextStatus },
      });
      await refetch();
      toast.success(
        `Apartamento ${apto.numero} alterado para ${nextStatus === "vazio" ? "Vazio (Livre)" : "Ocupado"}!`
      );
    } catch {
      toast.error("Erro ao alterar status do apartamento");
    }
  };

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
            <SelectItem value="vazio">Vazio (Livre)</SelectItem>
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
          <div className="rounded-md border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <SortableHeader field="numero" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      Número
                    </SortableHeader>
                    <SortableHeader field="bloco" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      Bloco
                    </SortableHeader>
                    <SortableHeader field="tipo" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      Tipo
                    </SortableHeader>
                    <SortableHeader field="proprietario_nome" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      Proprietário
                    </SortableHeader>
                    <SortableHeader field="status" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      Status
                    </SortableHeader>
                    <th className="p-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedApartamentos.map((apto) => (
                    <tr key={apto.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{apto.numero}</td>
                      <td className="p-3">{apto.bloco || "-"}</td>
                      <td className="p-3">{tipoLabel[apto.tipo] || apto.tipo}</td>
                      <td className="p-3">{apto.proprietario_id ? (proprietarioMap[apto.proprietario_id] || "—") : "-"}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(apto)}
                          disabled={updateMut.isPending}
                          title={`Clique para alternar para ${apto.status === "ocupado" ? "Vazio (Livre)" : "Ocupado"}`}
                          className="group inline-flex items-center focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-full"
                        >
                          <Badge
                            variant="outline"
                            className={`capitalize cursor-pointer transition-all hover:scale-105 select-none shadow-none hover:shadow-sm font-medium ${getStatusBadgeClass(
                              apto.status
                            )}`}
                          >
                            {statusLabel[apto.status] || apto.status}
                          </Badge>
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/apartamentos/${apto.id}`}>
                            <Button variant="ghost" size="icon" title="Editar apartamento"><Pencil className="h-4 w-4" /></Button>
                          </Link>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(apto.id)} title="Excluir apartamento"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum apartamento encontrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
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
