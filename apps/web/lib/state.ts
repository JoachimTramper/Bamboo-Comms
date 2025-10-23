import { atom } from "jotai";

export const authAtom = atom<{ userId: string | null; email: string | null }>({
  userId: null,
  email: null,
});
export const currentChannelAtom = atom<string | null>(null);
