import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  if (typeof date === "string") {
    const clean = date.split("T")[0];
    const parts = clean.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
    }
  }
  const d = new Date(date);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);
}

export function formatCompetencia(date: string | Date | null | undefined): string {
  if (!date) return "-";
  if (typeof date === "string") {
    const clean = date.split("T")[0];
    const parts = clean.split("-");
    if (parts.length >= 2) {
      return `${parts[1].padStart(2, "0")}/${parts[0]}`;
    }
  }
  const d = new Date(date);
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const y = d.getUTCFullYear();
  return `${m}/${y}`;
}

