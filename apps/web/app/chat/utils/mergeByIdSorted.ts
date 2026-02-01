import type { Message } from "../types";

export function mergeByIdSorted(existing: Message[], incoming: Message[]) {
  const byId = new Map(existing.map((m) => [m.id, m]));
  for (const m of incoming) {
    if (!byId.has(m.id)) byId.set(m.id, m);
  }
  return Array.from(byId.values()).sort(
    (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
  );
}
