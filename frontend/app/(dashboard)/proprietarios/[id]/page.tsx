"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditProprietarioRedirectPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (id) {
      router.replace(`/moradores/${id}`);
    }
  }, [router, id]);

  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
