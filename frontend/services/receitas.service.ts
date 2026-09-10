import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Receita, ReceitaCreate, ReceitaUpdate } from "@/types/financeiro";
import type { PaginatedResponse } from "@/types";

const KEY = "receitas";

export function useReceitas(params?: Record<string, any>) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => api.get<PaginatedResponse<Receita>>("/receitas", { params }).then((r) => r.data),
  });
}

export function useReceita(id: string) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => api.get<Receita>(`/receitas/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateReceita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ReceitaCreate) => api.post<Receita>("/receitas", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY], exact: false, refetchType: "all" });
    },
  });
}

export function useUpdateReceita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReceitaUpdate }) =>
      api.put<Receita>(`/receitas/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY], exact: false, refetchType: "all" });
    },
  });
}

export function useDeleteReceita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/receitas/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY], exact: false, refetchType: "all" });
    },
  });
}
