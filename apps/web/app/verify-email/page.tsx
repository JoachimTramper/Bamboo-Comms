import { Suspense } from "react";
import VerifyEmailClient from "./VerifyEmailClient";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main style={{ padding: 24, maxWidth: 600 }}>
          <p>Loading…</p>
        </main>
      }
    >
      <VerifyEmailClient />
    </Suspense>
  );
}
