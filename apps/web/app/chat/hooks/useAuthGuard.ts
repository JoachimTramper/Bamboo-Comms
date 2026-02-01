// hooks/useAuthGuard.ts
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { me } from "@/lib/api";
import type { Me } from "../types";

export function useAuthGuard() {
  const router = useRouter();
  const [user, setUser] = useState<Me | null>(null);

  useEffect(() => {
    me()
      .then((u) => setUser(u as Me))
      .catch(() => {
        setUser(null);
        router.replace("/login");
      });
  }, [router]);

  return { user, setUser };
}
