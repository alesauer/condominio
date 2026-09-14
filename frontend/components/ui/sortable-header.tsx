"use client";

import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface SortableHeaderProps {
  field: string;
  currentField: string | null;
  direction: "asc" | "desc";
  onSort: (field: string) => void;
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}

export function SortableHeader({
  field,
  currentField,
  direction,
  onSort,
  children,
  className = "",
  align = "left",
}: SortableHeaderProps) {
  const isSorted = currentField === field;

  return (
    <th
      className={`h-11 px-4 text-xs font-semibold uppercase tracking-wider select-none cursor-pointer transition-colors text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      } ${className}`}
      onClick={() => onSort(field)}
      title={`Clique para ordenar por ${typeof children === "string" ? children : field}`}
    >
      <div
        className={`inline-flex items-center gap-1.5 ${
          align === "right"
            ? "justify-end w-full"
            : align === "center"
            ? "justify-center w-full"
            : "justify-start"
        }`}
      >
        <span>{children}</span>
        {isSorted ? (
          direction === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary-600 shrink-0" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary-600 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40 hover:opacity-100 shrink-0" />
        )}
      </div>
    </th>
  );
}

