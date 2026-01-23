"use client";

import { useEffect, useRef, useState } from "react";
import { loginWithGoogle, login, register, me } from "@/lib/api";
import { useRouter } from "next/navigation";

const DISPLAYNAME_MAX = 32;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const router = useRouter();

  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Only show Google button on login mode
    if (mode !== "login") return;

    // Ensure client id exists
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setErr("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID");
      return;
    }

    // If script already loaded, just init
    const existing = document.getElementById("google-gsi");
    if (existing) {
      initGoogle(clientId);
      return;
    }

    // Load Google Identity Services script once
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = "google-gsi";
    script.onload = () => initGoogle(clientId);
    document.body.appendChild(script);

    function initGoogle(cid: string) {
      // @ts-ignore
      if (!window.google || !googleBtnRef.current) return;

      // Clear prior rendered button (helps in dev/StrictMode and mode toggles)
      googleBtnRef.current.innerHTML = "";

      try {
        // @ts-ignore
        window.google.accounts.id.cancel?.();
      } catch {}

      // @ts-ignore
      window.google.accounts.id.initialize({
        client_id: cid,
        callback: async (resp: any) => {
          try {
            setErr(null);
            setSuccess(null);

            const { needsUsername } = await loginWithGoogle(resp.credential);
            await me();

            if (needsUsername) {
              router.push("/choose-username"); // change if your route differs
            } else {
              router.push("/chat");
            }
          } catch (e: any) {
            setErr(
              e?.response?.data?.message || e?.message || "Google login failed",
            );
          }
        },
      });

      // @ts-ignore
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        shape: "pill",
        text: "continue_with",
      });
    }
  }, [mode, router]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(null);
    setSuccess(null);

    try {
      if (mode === "register") {
        await register(
          email,
          password,
          displayName.trim(),
          inviteCode.trim() || undefined,
        );

        setSuccess("Registered successfully. You can now sign in.");
        setMode("login");
        return;
      }

      await login(email, password);
      await me();
      router.push("/chat");
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Error");
    }
  }

  return (
    <div
      className="
        min-h-dvh grid place-items-center p-6
        bg-[url('/BackgroundLoginMobile.png')]
        bg-no-repeat bg-cover
        bg-[position:40%_50%]
        md:bg-[url('/BackgroundLoginDesktop.png')]
        md:bg-no-repeat md:bg-cover md:bg-center
      "
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-1">
          <img
            src="/BambooCommsLogo.png"
            alt="Bamboo Comms"
            className="w-48 md:w-64 lg:w-72"
          />
        </div>

        <form onSubmit={submit} className="w-full space-y-4">
          <div className="space-y-2">
            <input
              className="border rounded w-full p-2"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />

            <input
              className="border rounded w-full p-2"
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            {mode === "register" && (
              <>
                <input
                  className="border rounded w-full p-2"
                  placeholder="display name"
                  value={displayName}
                  maxLength={DISPLAYNAME_MAX}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onBlur={() => setDisplayName((v) => v.trim())}
                  autoComplete="name"
                />
                <div className="text-[11px] text-neutral-500 text-right">
                  {displayName.length}/{DISPLAYNAME_MAX}
                </div>

                <input
                  className="border rounded w-full p-2"
                  placeholder="Invite Code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
              </>
            )}
          </div>

          {success && (
            <p className="text-green-600 text-sm text-center">{success}</p>
          )}

          {err && <p className="text-red-600 text-sm text-center">{err}</p>}

          <button
            type="submit"
            className="
              w-full
              rounded-xl
              p-3
              bg-black
              text-white
              font-semibold
              hover:bg-gray-500
              active:scale-[0.98]
              focus:outline-none
              focus:ring-2
              focus:ring-black/50
              transition
            "
          >
            {mode === "register" ? "Create account" : "Sign in"}
          </button>

          {mode === "login" && (
            <div className="w-full flex flex-col gap-3 mt-4">
              <div className="flex items-center gap-3">
                <div className="h-px bg-black/20 flex-1" />
                <span className="text-xs text-black/60">or</span>
                <div className="h-px bg-black/20 flex-1" />
              </div>

              <div className="flex justify-center">
                <div ref={googleBtnRef} />
              </div>
            </div>
          )}
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setErr(null);
            setSuccess(null);
          }}
          className="text-sm underline w-full text-center"
        >
          {mode === "login" ? "Create an account" : "I already have an account"}
        </button>
      </div>
    </div>
  );
}
