/**
 * Tests for apartamentos service hooks.
 */
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  useApartamentos,
  useApartamento,
  useCreateApartamento,
  useUpdateApartamento,
  useDeleteApartamento,
} from "@/services/apartamentos.service";

jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    defaults: { baseURL: "/api/v1" },
    interceptors: {
      request: { use: jest.fn(), handlers: [] },
      response: { use: jest.fn(), handlers: [] },
    },
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockApto = {
  id: "apto-1",
  numero: "101",
  bloco: "A",
  tipo: "padrao",
  status: "vazio",
  fracao_ideal: null,
  metragem: null,
  vaga_demarcada: null,
  proprietario_id: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("Apartamentos Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("useApartamentos fetches paginated list", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { items: [mockApto], total: 1, page: 1, page_size: 20, total_pages: 1 },
    });

    const { result } = renderHook(() => useApartamentos(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0].numero).toBe("101");
    expect(api.get).toHaveBeenCalledWith("/apartamentos", { params: undefined });
  });

  it("useApartamento fetches single item", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockApto });

    const { result } = renderHook(() => useApartamento("apto-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.numero).toBe("101");
  });

  it("useCreateApartamento posts and invalidates", async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: mockApto });

    const { result } = renderHook(() => useCreateApartamento(), { wrapper });

    result.current.mutate({ numero: "101", tipo: "padrao", status: "vazio" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.post).toHaveBeenCalledWith("/apartamentos", {
      numero: "101", tipo: "padrao", status: "vazio",
    });
  });

  it("useDeleteApartamento deletes item", async () => {
    (api.delete as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useDeleteApartamento(), { wrapper });

    result.current.mutate("apto-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.delete).toHaveBeenCalledWith("/apartamentos/apto-1");
  });

  it("useUpdateApartamento updates item and invalidates", async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: { ...mockApto, status: "ocupado" } });

    const { result } = renderHook(() => useUpdateApartamento(), { wrapper });

    result.current.mutate({ id: "apto-1", data: { status: "ocupado" } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.put).toHaveBeenCalledWith("/apartamentos/apto-1", { status: "ocupado" });
  });
});
