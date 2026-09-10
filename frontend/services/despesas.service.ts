import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Despesa, DespesaCreate, DespesaUpdate } from "@/types/financeiro";
import type { PaginatedResponse } from "@/types";

const KEY = "despesas";

export function useDespesas(params?: Record<string, any>) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => api.get<PaginatedResponse<Despesa>>("/despesas", { params }).then((r) => r.data),
  });
}

export function useDespesa(id: string) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => api.get<Despesa>(`/despesas/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateDespesa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DespesaCreate) => api.post<Despesa>("/despesas", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY], exact: false, refetchType: "all" });
    },
  });
}

export function useUpdateDespesa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DespesaUpdate }) =>
      api.put<Despesa>(`/despesas/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY], exact: false, refetchType: "all" });
    },
  });
}

export function useDeleteDespesa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/despesas/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY], exact: false, refetchType: "all" });
    },
  });
}
