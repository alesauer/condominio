import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export function useMe() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.get("/auth/me").then((r) => r.data),
  });
}
