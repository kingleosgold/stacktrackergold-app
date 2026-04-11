export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="w-1.5 h-1.5 rounded-full bg-[#DAA520] animate-bounce [animation-delay:-0.3s]" />
      <div className="w-1.5 h-1.5 rounded-full bg-[#DAA520] animate-bounce [animation-delay:-0.15s]" />
      <div className="w-1.5 h-1.5 rounded-full bg-[#DAA520] animate-bounce" />
      <span className="ml-2 text-xs text-text-muted">Troy is thinking…</span>
    </div>
  );
}
