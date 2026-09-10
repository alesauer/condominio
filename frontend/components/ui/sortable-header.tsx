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
      className={`p-3 font-semibold select-none cursor-pointer transition-colors hover:text-foreground hover:bg-muted/70 ${
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
            <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0 transition-transform" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0 transition-transform" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40 hover:opacity-100 shrink-0 transition-opacity" />
        )}
      </div>
    </th>
  );
}
