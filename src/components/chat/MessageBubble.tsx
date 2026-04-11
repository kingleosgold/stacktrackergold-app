import type { TroyMessage } from '../../services/troy';
import { InlineCard } from './inline/InlineCard';
import { ListenButton } from './ListenButton';

interface Props {
  message: TroyMessage;
  userId: string;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function boldify(text: string): string {
  // Minimal markdown: **bold** and line breaks only.
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

export function MessageBubble({ message, userId }: Props) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end px-4 message-enter">
        <div className="max-w-[85%]">
          <div className="bg-[#DAA520] text-[#1a1508] rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed">
            <div dangerouslySetInnerHTML={{ __html: boldify(message.content) }} />
          </div>
          <div className="text-[10px] text-text-muted text-right mt-1">{formatTime(message.created_at)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 px-4 message-enter">
      <img src="/troy-avatar.png" alt="Troy" className="w-7 h-7 rounded-full shrink-0 mt-1" />
      <div className="flex-1 min-w-0 max-w-[85%]">
        <div className="text-[11px] font-semibold text-[#DAA520] mb-1">Troy</div>
        <div className="bg-white/5 border border-white/10 text-text rounded-2xl rounded-tl-md px-4 py-2.5 text-sm leading-relaxed">
          <div dangerouslySetInnerHTML={{ __html: boldify(message.content) }} />
          {message.preview && <InlineCard preview={message.preview} />}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-text-muted mt-1">{formatTime(message.created_at)}</div>
          <ListenButton text={message.content} userId={userId} />
        </div>
      </div>
    </div>
  );
}
