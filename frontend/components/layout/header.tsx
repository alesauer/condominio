"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "next-themes";

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-3 border-b bg-background px-6">
      <span className="text-sm text-muted-foreground">
        {user?.nome}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  );
}
