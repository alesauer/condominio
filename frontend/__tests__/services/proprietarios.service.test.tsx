/**
 * Tests for proprietarios service hooks.
 */
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  useProprietarios,
  useProprietario,
  useCreateProprietario,
  useUpdateProprietario,
  useDeleteProprietario,
  useProprietarioApartamentos,
} from "@/services/proprietarios.service";

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

const mockProprietario = {
  id: "prop-1",
  nome: "João Silva",
  cpf: "12345678901",
  telefone: "11999999999",
  email: "joao@email.com",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("Proprietarios Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("useProprietarios fetches list", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { items: [mockProprietario], total: 1, page: 1, page_size: 20, total_pages: 1 },
    });

    const { result } = renderHook(() => useProprietarios(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0].nome).toBe("João Silva");
  });

  it("useProprietario fetches single", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockProprietario });

    const { result } = renderHook(() => useProprietario("prop-1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.cpf).toBe("12345678901");
  });

  it("useCreateProprietario posts and invalidates", async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: mockProprietario });

    const { result } = renderHook(() => useCreateProprietario(), { wrapper });
    result.current.mutate({ nome: "João Silva", cpf: "12345678901" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useDeleteProprietario deletes", async () => {
    (api.delete as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useDeleteProprietario(), { wrapper });
    result.current.mutate("prop-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.delete).toHaveBeenCalledWith("/proprietarios/prop-1");
  });

  it("useProprietarioApartamentos fetches with id", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
    });

    const { result } = renderHook(() => useProprietarioApartamentos("prop-1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.get).toHaveBeenCalledWith("/proprietarios/prop-1/apartamentos", { params: undefined });
  });
});
