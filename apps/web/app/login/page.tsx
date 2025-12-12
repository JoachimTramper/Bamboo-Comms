"use client";
import { useState } from "react";
import { login, register, me } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("supersecret");
  const [displayName, setDisplayName] = useState("Tester");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function submit() {
    setErr(null);
    try {
      if (mode === "register") await register(email, password, displayName);
      else await login(email, password);
      await me(); // smoke check
      router.push("/chat");
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Error");
    }
  }

  return (
    <div
      className="
      min-h-dvh grid place-items-center p-6

      /* MOBILE LOGIN BACKGROUND */
      bg-[url('/BackgroundLoginMobile.png')]
      bg-no-repeat bg-cover bg-center

      /* DESKTOP LOGIN BACKGROUND */
      md:bg-[url('/BackgroundLoginDesktop.png')]
      md:bg-no-repeat md:bg-cover md:bg-center
    "
    >
      <div className="max-w-sm w-full space-y-4">
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <div className="space-y-2">
          <input
            className="border rounded w-full p-2"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="border rounded w-full p-2"
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "register" && (
            <input
              className="border rounded w-full p-2"
              placeholder="display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
        </div>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button
          onClick={submit}
          className="w-full border rounded p-2 hover:bg-gray-50"
        >
          {mode === "register" ? "Create account" : "Sign in"}
        </button>
        <button
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="text-sm underline"
        >
          {mode === "login" ? "Create an account" : "I already have an account"}
        </button>
      </div>
    </div>
  );
}
