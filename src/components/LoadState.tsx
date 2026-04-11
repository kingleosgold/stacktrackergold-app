interface ErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-[#94A3B8]">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full border-2 border-[#C9A84C]/30 border-t-[#C9A84C] animate-spin" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}

export function ErrorState({ message = 'Unable to load data.', onRetry }: ErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-[#EF4444]/10 flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-[#EF4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-sm text-[#94A3B8] mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold text-[#0B1120] transition-opacity hover:opacity-90"
          style={{ background: '#C9A84C' }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-[#94A3B8] text-sm">
      {message}
    </div>
  );
}
