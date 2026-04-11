import { useRef, useState } from 'react';
import { AttachmentMenu } from './AttachmentMenu';

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  onPhoto: (file: File) => void;
  onSpreadsheet: (file: File) => void;
  loading: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, onStop, onPhoto, onSpreadsheet, loading, disabled, placeholder }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || loading || disabled) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const autosize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  return (
    <div className="flex items-end gap-2 rounded-2xl bg-white/5 border border-white/10 px-2 py-1.5">
      <AttachmentMenu onPhoto={onPhoto} onSpreadsheet={onSpreadsheet} disabled={disabled || loading} />

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => { setText(e.target.value); autosize(e.target); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        disabled={disabled}
        placeholder={placeholder ?? 'Ask Troy anything…'}
        className="flex-1 resize-none bg-transparent outline-none text-sm text-text placeholder:text-text-muted py-2 max-h-40"
      />

      {loading ? (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop generation"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#DAA520] text-[#1a1508] hover:bg-[#E8B42E] transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="1.5" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() || disabled}
          aria-label="Send message"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#DAA520] text-[#1a1508] hover:bg-[#E8B42E] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      )}
    </div>
  );
}
