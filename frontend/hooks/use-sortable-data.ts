import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc";

const STATUS_PRIORITY: Record<string, number> = {
  pago: 1,
  paga: 1,
  recebido: 1,
  concluido: 1,
  ativo: 1,
  ocupado: 1,
  pendente: 2,
  aberto: 2,
  alugado: 2,
  atrasado: 3,
  vazio: 3,
  cancelado: 4,
};

export function useSortableData<T>(
  items: T[] = [],
  initialField?: keyof T | string,
  initialDirection: SortDirection = "asc"
) {
  const [sortField, setSortField] = useState<keyof T | string | null>(initialField || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  const requestSort = (field: keyof T | string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedItems = useMemo(() => {
    if (!sortField || !items) return items || [];

    return [...items].sort((a: any, b: any) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Se for nulo ou indefinido, coloca no final
      if (aVal === null || aVal === undefined) return sortDirection === "asc" ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortDirection === "asc" ? -1 : 1;

      // Ordenação customizada para status (ex: pago primeiro)
      if (sortField === "status" || String(sortField).toLowerCase().includes("status")) {
        const keyA = String(aVal).toLowerCase().trim();
        const keyB = String(bVal).toLowerCase().trim();
        const prioA = STATUS_PRIORITY[keyA];
        const prioB = STATUS_PRIORITY[keyB];

        if (prioA !== undefined && prioB !== undefined && prioA !== prioB) {
          return sortDirection === "asc" ? prioA - prioB : prioB - prioA;
        }
      }

      // Se ambos forem números ou puderem ser convertidos sem erro
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      const numA = Number(aVal);
      const numB = Number(bVal);
      if (
        (!isNaN(numA) && !isNaN(numB) && typeof aVal !== "boolean" && typeof bVal !== "boolean" && typeof aVal !== "string") ||
        (!isNaN(numA) && !isNaN(numB) && String(aVal).match(/^[0-9.]+$/) && String(bVal).match(/^[0-9.]+$/))
      ) {
        return sortDirection === "asc" ? numA - numB : numB - numA;
      }

      // Comparação de string ou datas no formato ISO
      const strA = String(aVal).trim();
      const strB = String(bVal).trim();

      return sortDirection === "asc"
        ? strA.localeCompare(strB, "pt-BR", { sensitivity: "base", numeric: true })
        : strB.localeCompare(strA, "pt-BR", { sensitivity: "base", numeric: true });
    });
  }, [items, sortField, sortDirection]);

  return { items: sortedItems, sortField, sortDirection, requestSort, setSortField, setSortDirection };
}
