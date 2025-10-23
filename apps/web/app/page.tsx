"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { me } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        await me(); // server verifies token
        router.replace("/chat");
      } catch {
        router.replace("/login");
      }
    })();
  }, [router]);

  return (
    <main className="flex items-center justify-center h-screen text-gray-700">
      <p>Redirecting...</p>
    </main>
  );
}
