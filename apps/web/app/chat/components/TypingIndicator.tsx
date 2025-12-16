"use client";

export function TypingIndicator({ label }: { label: string | null }) {
  if (!label) return null;

  return (
    <div className="px-3 md:px-4 py-2 bg-white border-t flex items-center gap-2">
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-typingDot1" />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-typingDot2" />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-typingDot3" />
      </div>
      <span className="text-xs text-gray-600">{label}</span>
    </div>
  );
}
