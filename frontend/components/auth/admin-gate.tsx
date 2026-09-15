"use client"

import React from "react"
import { useAuth } from "@/hooks/use-auth"

interface AdminGateProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * AdminGate renders its children only if the logged-in user is an administrator / síndico.
 * Otherwise, it renders the fallback (or null).
 */
export function AdminGate({ children, fallback = null }: AdminGateProps) {
  const { isAdmin } = useAuth()

  if (!isAdmin) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * ReadOnlyNotice renders a subtle info banner informing the user that they are in read-only mode.
 */
export function ReadOnlyNotice() {
  const { isReadOnly, roleLabel } = useAuth()

  if (!isReadOnly) return null

  return (
    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-blue-700">
      <span className="font-semibold">{roleLabel}:</span>
      <span>Você possui permissão de leitura em todo o sistema. Apenas o Síndico pode criar, editar ou excluir registros.</span>
    </div>
  )
}

export function RestrictedPageNotice({
  backHref,
  backLabel = "Voltar",
}: {
  backHref: string
  backLabel?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-slate-50 space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-800">Acesso Restrito ao Síndico</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Esta ação de criação e edição é restrita a administradores. Usuários com perfil de Morador ou Proprietário possuem acesso apenas como leitura em todo o sistema.
        </p>
      </div>
      <a href={backHref} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md bg-white hover:bg-slate-100 transition-colors">
        ← {backLabel}
      </a>
    </div>
  )
}


