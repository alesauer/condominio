"use client";
import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSortableData } from "@/hooks/use-sortable-data";
import { formatDate } from "@/lib/utils";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

export default function AssembleiasPage() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["assembleias", page], queryFn: () => api.get(`/assembleias?page=${page}&page_size=10`).then(r => r.data) });

  const { items: sortedAssembleias, sortField, sortDirection, requestSort } = useSortableData(
    data?.items || [],
    "data",
    "desc"
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assembleias</h1>
          <p className="text-muted-foreground">Reuniões do condomínio</p>
        </div>
        <Link href="/assembleias/nova">
          <Button><Plus className="mr-2 h-4 w-4" /> Nova Assembleia</Button>
        </Link>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-xs font-semibold uppercase tracking-wider">Ordenar por:</span>
        <Button
          variant={sortField === "data" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => requestSort("data")}
        >
          Data
          {sortField === "data" && (
            sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3 text-primary" /> : <ArrowDown className="ml-1 h-3 w-3 text-primary" />
          )}
        </Button>
        <Button
          variant={sortField === "titulo" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => requestSort("titulo")}
        >
          Título
          {sortField === "titulo" && (
            sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3 text-primary" /> : <ArrowDown className="ml-1 h-3 w-3 text-primary" />
          )}
        </Button>
        <Button
          variant={sortField === "local" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => requestSort("local")}
        >
          Local
          {sortField === "local" && (
            sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3 text-primary" /> : <ArrowDown className="ml-1 h-3 w-3 text-primary" />
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (
        <div className="space-y-3">
          {sortedAssembleias.map((a: any) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{a.titulo}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatDate(a.data)}</span>
                    <Button variant="ghost" size="icon" onClick={async () => { if (confirm("Excluir?")) { await api.delete(`/assembleias/${a.id}`); qc.invalidateQueries({queryKey:["assembleias"]}); toast.success("Excluída"); } }}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{a.descricao || "Sem descrição"}</p>
                <p className="text-xs text-muted-foreground mt-1">Local: {a.local || "-"}</p>
              </CardContent>
            </Card>
          ))}
          {sortedAssembleias.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma assembleia encontrada</p>}
        </div>
      )}
    </div>
  );
}
