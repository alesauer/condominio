"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

interface User {
  id: string;
  nome: string;
  email: string;
  role: "admin" | "morador" | "proprietario";
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isReadOnly: boolean;
  roleLabel: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("access_token", res.data.access_token);
    localStorage.setItem("refresh_token", res.data.refresh_token);
    await fetchUser();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      } catch {}
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  }, []);

  const isAdmin = user?.role === "admin";
  const isReadOnly = user?.role === "morador" || user?.role === "proprietario";
  
  let roleLabel = "Visitante";
  if (user?.role === "admin") {
    roleLabel = "Síndico (Admin)";
  } else if (user?.role === "morador") {
    roleLabel = "Morador";
  } else if (user?.role === "proprietario") {
    roleLabel = "Proprietário";
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin,
        isReadOnly,
        roleLabel,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
