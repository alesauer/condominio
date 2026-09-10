"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProprietariosRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/moradores?tipo=proprietario");
  }, [router]);

  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
