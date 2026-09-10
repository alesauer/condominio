import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Apartamento, ApartamentoCreate, ApartamentoUpdate } from "@/types/apartamento";
import type { Morador } from "@/types/morador";
import type { PaginatedResponse } from "@/types";

const KEY = "apartamentos";

export function useApartamentos(params?: Record<string, any>) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => api.get<PaginatedResponse<Apartamento>>("/apartamentos", { params }).then((r) => r.data),
  });
}

export function useApartamento(id: string) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => api.get<Apartamento>(`/apartamentos/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useApartamentoMoradores(id: string) {
  return useQuery({
    queryKey: [KEY, id, "moradores"],
    queryFn: () => api.get<Morador[]>(`/apartamentos/${id}/moradores`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateApartamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ApartamentoCreate) => api.post("/apartamentos", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateApartamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApartamentoUpdate }) =>
      api.put(`/apartamentos/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteApartamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/apartamentos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
