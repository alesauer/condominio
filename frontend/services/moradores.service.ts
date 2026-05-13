import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Morador, MoradorCreate, MoradorUpdate } from "@/types/morador";
import type { PaginatedResponse } from "@/types";

const KEY = "moradores";

export function useMoradores(params?: Record<string, any>) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => api.get<PaginatedResponse<Morador>>("/moradores", { params }).then((r) => r.data),
  });
}

export function useMorador(id: string) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => api.get<Morador>(`/moradores/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateMorador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MoradorCreate) => api.post("/moradores", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateMorador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MoradorUpdate }) =>
      api.put(`/moradores/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteMorador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/moradores/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
