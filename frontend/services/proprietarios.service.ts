import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Proprietario, ProprietarioCreate, ProprietarioUpdate } from "@/types/proprietario";
import type { PaginatedResponse } from "@/types";

import type { Apartamento } from "@/types/apartamento";

const KEY = "proprietarios";

export function useProprietarios(params?: Record<string, any>) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => api.get<PaginatedResponse<Proprietario>>("/proprietarios", { params }).then((r) => r.data),
  });
}

export function useProprietario(id: string) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => api.get<Proprietario>(`/proprietarios/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useProprietarioApartamentos(proprietario_id: string, params?: Record<string, any>) {
  return useQuery({
    queryKey: [KEY, proprietario_id, "apartamentos", params],
    queryFn: () => api.get<PaginatedResponse<Apartamento>>(`/proprietarios/${proprietario_id}/apartamentos`, { params }).then((r) => r.data),
    enabled: !!proprietario_id,
  });
}

export function useCreateProprietario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProprietarioCreate) => api.post("/proprietarios", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateProprietario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProprietarioUpdate }) =>
      api.put(`/proprietarios/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteProprietario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/proprietarios/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
