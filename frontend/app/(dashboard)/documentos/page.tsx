"use client";

import { useState } from "react";
import api from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useSortableData } from "@/hooks/use-sortable-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { Upload, Download, Trash2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

const categoriaLabel: Record<string, string> = {
  atas: "Atas",
  boletos: "Boletos",
  comprovantes: "Comprovantes",
  contratos: "Contratos",
  convencao: "Convenção",
  outros: "Outros",
};

export default function DocumentosPage() {
  const [page, setPage] = useState(1);
  const [categoria, setCategoria] = useState("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const qc = useQueryClient();

  const catFilter = categoria === "all" ? undefined : categoria;

  const { data, isLoading } = useQuery({
    queryKey: ["documentos", page, catFilter],
    queryFn: () =>
      api
        .get(`/documentos`, {
          params: { page, page_size: 10, categoria: catFilter },
        })
        .then((r) => r.data),
  });

  const { items: sortedItems, sortField, sortDirection, requestSort } = useSortableData(
    data?.items || [],
    "created_at",
    "desc"
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("nome", file.name);
    formData.append("categoria", categoria === "all" ? "outros" : categoria);

    try {
      await api.post("/documentos", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      qc.invalidateQueries({ queryKey: ["documentos"] });
      toast.success("Documento enviado com sucesso!");
    } catch {
      toast.error("Erro ao enviar documento.");
    } finally {
      e.target.value = "";
    }
  };

  const handleDownload = async (id: string, nome: string) => {
    try {
      setDownloadingId(id);
      const res = await api.get(`/documentos/${id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", nome);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Erro ao baixar documento.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;
    try {
      await api.delete(`/documentos/${id}`);
      qc.invalidateQueries({ queryKey: ["documentos"] });
      toast.success("Documento excluído com sucesso!");
    } catch {
      toast.error("Erro ao excluir documento.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
          <p className="text-muted-foreground">
            Gestão de arquivos, atas, contratos e convenções do condomínio
          </p>
        </div>

        <label>
          <Button asChild className="cursor-pointer">
            <span>
              <Upload className="mr-2 h-4 w-4" /> Enviar Documento
            </span>
          </Button>
          <input type="file" className="hidden" onChange={handleUpload} />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={categoria}
          onValueChange={(v) => {
            setCategoria(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            <SelectItem value="atas">Atas</SelectItem>
            <SelectItem value="boletos">Boletos</SelectItem>
            <SelectItem value="comprovantes">Comprovantes</SelectItem>
            <SelectItem value="contratos">Contratos</SelectItem>
            <SelectItem value="convencao">Convenção</SelectItem>
            <SelectItem value="outros">Outros</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <SortableHeader field="nome" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                    Nome do Arquivo
                  </SortableHeader>
                  <SortableHeader field="categoria" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                    Categoria
                  </SortableHeader>
                  <SortableHeader field="tamanho_bytes" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                    Tamanho
                  </SortableHeader>
                  <SortableHeader field="created_at" currentField={sortField} direction={sortDirection} onSort={requestSort}>
                    Data de Envio
                  </SortableHeader>
                  <th className="p-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((d: any) => {
                  const tamanhoKb = d.tamanho_bytes ? `${(d.tamanho_bytes / 1024).toFixed(1)} KB` : "—";
                  return (
                    <tr key={d.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{d.nome}</span>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {categoriaLabel[d.categoria] || d.categoria}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{tamanhoKb}</td>
                      <td className="p-3 text-muted-foreground">{formatDate(d.created_at)}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={downloadingId === d.id}
                            onClick={() => handleDownload(d.id, d.nome)}
                            title="Baixar arquivo"
                          >
                            {downloadingId === d.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 text-primary" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(d.id)}
                            title="Excluir arquivo"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {sortedItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Nenhum documento cadastrado nesta categoria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Total de {data.total} documentos
              </span>
              <div className="flex items-center gap-2">
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
