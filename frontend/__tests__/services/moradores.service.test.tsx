/**
 * Tests for moradores service hooks.
 * Tests that React Query hooks are configured correctly.
 */
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  useMoradores,
  useMorador,
  useCreateMorador,
  useUpdateMorador,
  useDeleteMorador,
} from "@/services/moradores.service";

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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockMorador = {
  id: "123",
  nome: "João",
  cpf: "12345678900",
  telefone: "11999999999",
  email: "joao@email.com",
  veiculo: null,
  tipo: "morador",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("Moradores Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("useMoradores fetches list", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { items: [mockMorador], total: 1, page: 1, page_size: 20, total_pages: 1 },
    });

    const { result } = renderHook(() => useMoradores(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(1);
    expect(result.current.data?.items[0].nome).toBe("João");
  });

  it("useMorador fetches single item", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockMorador });

    const { result } = renderHook(() => useMorador("123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.nome).toBe("João");
  });

  it("useCreateMorador posts data and invalidates", async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: mockMorador });

    const { result } = renderHook(() => useCreateMorador(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ nome: "João", tipo: "morador" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.post).toHaveBeenCalledWith("/moradores", { nome: "João", tipo: "morador" });
  });

  it("useUpdateMorador puts data", async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: mockMorador });

    const { result } = renderHook(() => useUpdateMorador(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "123", data: { nome: "João Updated" } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.put).toHaveBeenCalledWith("/moradores/123", { nome: "João Updated" });
  });

  it("useDeleteMorador deletes item", async () => {
    (api.delete as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useDeleteMorador(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("123");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.delete).toHaveBeenCalledWith("/moradores/123");
  });
});
