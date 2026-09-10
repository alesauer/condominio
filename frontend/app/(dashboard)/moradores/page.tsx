"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useMoradores, useDeleteMorador } from "@/services/moradores.service";
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
import { Plus, Search, Pencil, Trash2, Home, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import type { Morador } from "@/types/morador";

const tipoLabel: Record<string, string> = {
  proprietario: "Proprietário",
  inquilino: "Inquilino",
  morador: "Morador",
  dependente: "Dependente",
};

const getTipoBadgeClass = (tipo: string) => {
  switch (tipo) {
    case "proprietario":
      return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
    case "inquilino":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "morador":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "dependente":
      return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30";
    default:
      return "bg-muted text-foreground border-border";
  }
};

export default function MoradoresPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");

  const toApi = (v: string) => (v === "" || v === "all" ? undefined : v);
  const { data, isLoading } = useMoradores({
    page,
    page_size: 20,
    search: search || undefined,
    tipo: toApi(tipoFilter),
  });
  const deleteMut = useDeleteMorador();

  // Enriquecer dados para ordenação (ex: texto de apartamentos)
  const formattedItems = useMemo(() => {
    return (data?.items || []).map((m) => ({
      ...m,
      apartamentos_str: (m.apartamentos || []).map((a) => a.numero).join(", "),
    }));
  }, [data?.items]);

  const { items: sortedMoradores, sortField, sortDirection, requestSort } = useSortableData(
    formattedItems,
    "nome",
    "asc"
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cadastro?")) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Cadastro excluído com sucesso");
    } catch {
      toast.error("Erro ao excluir cadastro");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Moradores e Proprietários</h1>
          <p className="text-muted-foreground">
            Gerencie os moradores, proprietários, inquilinos e seus vínculos com os apartamentos
          </p>
        </div>
        <Link href="/moradores/novo">
          <Button className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Novo Cadastro
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou email..."
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={tipoFilter}
          onValueChange={(v) => {
            setTipoFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo de Cadastro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            <SelectItem value="proprietario">Proprietário</SelectItem>
            <SelectItem value="inquilino">Inquilino</SelectItem>
            <SelectItem value="morador">Morador</SelectItem>
            <SelectItem value="dependente">Dependente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-md border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left font-medium text-muted-foreground">
                    <SortableHeader field="nome" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      Nome / Contato
                    </SortableHeader>
                    <SortableHeader field="cpf" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      CPF
                    </SortableHeader>
                    <SortableHeader field="tipo" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      Tipo
                    </SortableHeader>
                    <SortableHeader field="apartamentos_str" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      Apartamento(s)
                    </SortableHeader>
                    <SortableHeader field="telefone" currentField={sortField as string} direction={sortDirection} onSort={requestSort}>
                      Telefone
                    </SortableHeader>
                    <th className="p-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedMoradores.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">
                        <div>{m.nome}</div>
                        {m.email && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Mail className="h-3 w-3" />
                            <span>{m.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">{m.cpf || "—"}</td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`capitalize font-medium shadow-none ${getTipoBadgeClass(m.tipo)}`}
                        >
                          {tipoLabel[m.tipo] || m.tipo}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 items-center">
                          {m.apartamentos && m.apartamentos.length > 0 ? (
                            m.apartamentos.map((ap) => (
                              <Badge
                                key={ap.apartamento_id}
                                variant="outline"
                                className="text-xs font-medium bg-muted/50 text-foreground border-border/80 hover:bg-muted"
                                title={
                                  ap.tipo_vinculo === "proprietario"
                                    ? "Proprietário desta unidade"
                                    : "Residente / Inquilino desta unidade"
                                }
                              >
                                <Home className="h-3 w-3 mr-1 text-primary" />
                                Apto {ap.numero}{ap.bloco ? ` - ${ap.bloco}` : ""}
                                {ap.tipo_vinculo === "proprietario" && (
                                  <span className="ml-1 text-[10px] text-blue-600 dark:text-blue-400 font-semibold">• Prop</span>
                                )}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-xs italic">Sem vínculo</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {m.telefone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{m.telefone}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/moradores/${m.id}`}>
                            <Button variant="ghost" size="icon" title="Editar cadastro" className="h-8 w-8 hover:bg-muted">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(m.id)}
                            title="Excluir cadastro"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!data?.items || data.items.length === 0) && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        <p className="font-medium">Nenhum morador ou proprietário encontrado.</p>
                        <p className="text-xs mt-1">Altere os filtros acima ou cadastre uma nova pessoa.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {data.total_pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
