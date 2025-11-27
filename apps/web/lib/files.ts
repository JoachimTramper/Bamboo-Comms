// lib/files.ts
export function resolveFileUrl(path: string): string {
  if (!path) return "";

  // If backend already returns an absolute url → use that
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
  return `${base}${path}`;
}
