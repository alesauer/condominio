"use client";
import { useState } from "react";
import api from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { Upload, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function DocumentosPage() {
  const [page, setPage] = useState(1);
  const [categoria, setCategoria] = useState("");
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["documentos", page, categoria], queryFn: () => api.get(`/documentos?page=${page}&page_size=10${categoria ? `&categoria=${categoria}` : ""}`).then(r => r.data) });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("nome", file.name);
    formData.append("categoria", categoria || "outros");
    try { await api.post("/documentos", formData, { headers: { "Content-Type": "multipart/form-data" } }); qc.invalidateQueries({ queryKey: ["documentos"] }); toast.success("Documento enviado"); }
    catch { toast.error("Erro ao enviar"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Documentos</h1><p className="text-muted-foreground">Documentos do condomínio</p></div>
        <label><Button asChild><span><Upload className="mr-2 h-4 w-4" /> Upload</span></Button><input type="file" className="hidden" onChange={handleUpload} /></label>
      </div>
      <div className="flex gap-2">
        <Select value={categoria} onValueChange={(v) => { setCategoria(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="ata">Ata</SelectItem>
            <SelectItem value="boleto">Boleto</SelectItem>
            <SelectItem value="comprovante">Comprovante</SelectItem>
            <SelectItem value="contrato">Contrato</SelectItem>
            <SelectItem value="convencao">Convenção</SelectItem>
            <SelectItem value="outros">Outros</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
        <div className="rounded-md border"><table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50 text-left"><th className="p-3 font-medium">Nome</th><th className="p-3 font-medium">Categoria</th><th className="p-3 font-medium">Data</th><th className="p-3 font-medium text-right">Ações</th></tr></thead>
          <tbody>
            {data?.items.map((d: any) => (
              <tr key={d.id} className="border-b hover:bg-muted/30"><td className="p-3 font-medium">{d.nome}</td><td className="p-3">{d.categoria}</td><td className="p-3">{formatDate(d.created_at)}</td>
                <td className="p-3 text-right">
                  <a href={`/api/v1/documentos/${d.id}/download`}><Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button></a>
                  <Button variant="ghost" size="icon" onClick={async () => { if (confirm("Excluir?")) { await api.delete(`/documentos/${d.id}`); qc.invalidateQueries({ queryKey: ["documentos"] }); toast.success("Excluído"); } }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </td>
              </tr>
            ))}
            {data?.items.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhum documento encontrado</td></tr>}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
