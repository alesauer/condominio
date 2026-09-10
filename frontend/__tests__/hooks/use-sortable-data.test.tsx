import { renderHook, act } from "@testing-library/react";
import { useSortableData } from "@/hooks/use-sortable-data";

describe("useSortableData hook", () => {
  const sampleData = [
    { id: "1", nome: "Carlos", valor: 150.5, data: "2026-08-10" },
    { id: "2", nome: "Ana", valor: 50.0, data: "2026-09-01" },
    { id: "3", nome: "Bruno", valor: 300.0, data: "2026-07-20" },
  ];

  it("should sort strings in ascending and descending order", () => {
    const { result } = renderHook(() => useSortableData(sampleData, "nome", "asc"));

    expect(result.current.items.map((i) => i.nome)).toEqual(["Ana", "Bruno", "Carlos"]);

    act(() => {
      result.current.requestSort("nome");
    });

    expect(result.current.items.map((i) => i.nome)).toEqual(["Carlos", "Bruno", "Ana"]);
    expect(result.current.sortDirection).toBe("desc");
  });

  it("should sort numbers properly", () => {
    const { result } = renderHook(() => useSortableData(sampleData, "valor", "asc"));

    expect(result.current.items.map((i) => i.valor)).toEqual([50.0, 150.5, 300.0]);

    act(() => {
      result.current.requestSort("valor");
    });

    expect(result.current.items.map((i) => i.valor)).toEqual([300.0, 150.5, 50.0]);
  });

  it("should switch field and default to asc", () => {
    const { result } = renderHook(() => useSortableData(sampleData, "nome", "asc"));

    act(() => {
      result.current.requestSort("data");
    });

    expect(result.current.sortField).toBe("data");
    expect(result.current.sortDirection).toBe("asc");
    expect(result.current.items.map((i) => i.data)).toEqual([
      "2026-07-20",
      "2026-08-10",
      "2026-09-01",
    ]);
  });

  it("handles null and undefined values cleanly", () => {
    const dataWithNulls = [
      { id: "1", val: 10 },
      { id: "2", val: null },
      { id: "3", val: 5 },
    ];

    const { result } = renderHook(() => useSortableData(dataWithNulls, "val", "asc"));
    expect(result.current.items[0].val).toBe(5);
    expect(result.current.items[1].val).toBe(10);
    expect(result.current.items[2].val).toBeNull();
  });

  it("prioritizes status 'pago' first when sorting by status", () => {
    const dataWithStatus = [
      { id: "1", descricao: "Internet", status: "pendente" },
      { id: "2", descricao: "Água", status: "pago" },
      { id: "3", descricao: "Luz", status: "atrasado" },
      { id: "4", descricao: "Manutenção", status: "pago" },
    ];

    const { result } = renderHook(() => useSortableData(dataWithStatus, "status", "asc"));

    expect(result.current.items.map((i) => i.status)).toEqual([
      "pago",
      "pago",
      "pendente",
      "atrasado",
    ]);

    act(() => {
      result.current.requestSort("status");
    });

    expect(result.current.items.map((i) => i.status)).toEqual([
      "atrasado",
      "pendente",
      "pago",
      "pago",
    ]);
  });
});
