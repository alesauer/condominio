import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Cobranca } from "@/types/financeiro";
import type { PaginatedResponse } from "@/types";

const KEY = "cobrancas";

export function useCobrancas(params?: Record<string, any>) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => api.get<PaginatedResponse<Cobranca>>("/cobrancas", { params }).then(r => r.data) });
}
export function usePagarCobranca() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.put(`/cobrancas/${id}/pagar`), onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }) });
}
