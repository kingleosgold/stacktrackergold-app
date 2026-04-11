interface Props {
  suggestions: string[];
  onSelect: (s: string) => void;
  variant?: 'stacked' | 'inline';
  disabled?: boolean;
}

export function SuggestionChips({ suggestions, onSelect, variant = 'stacked', disabled }: Props) {
  if (variant === 'inline') {
    return (
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            disabled={disabled}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-[#DAA520]/30 text-[#DAA520] hover:bg-[#DAA520]/10 transition-colors disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 items-center">
      {suggestions.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          disabled={disabled}
          className="text-sm px-4 py-2 rounded-full border border-[#DAA520]/30 text-[#DAA520] hover:bg-[#DAA520]/10 transition-colors disabled:opacity-40 min-w-[220px]"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
