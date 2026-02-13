import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { PricingModal } from './PricingModal';
import { sendAdvisorMessage } from '../services/api';
import type { AdvisorMessage } from '../services/api';

const DAILY_LIMIT = 25;
const STORAGE_KEY = 'advisor_usage';

const SUGGESTED_QUESTIONS = [
  'How is my portfolio performing?',
  'Should I buy more silver or gold?',
  'Analyze my gold-to-silver ratio',
  'What if silver hits $100?',
  "What's my best and worst purchase?",
];

function getUsageToday(): { count: number; date: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, date: '' };
    const parsed = JSON.parse(raw);
    const today = new Date().toISOString().split('T')[0];
    if (parsed.date === today) return parsed;
    return { count: 0, date: today };
  } catch {
    return { count: 0, date: '' };
  }
}

function incrementUsage(): number {
  const today = new Date().toISOString().split('T')[0];
  const usage = getUsageToday();
  const newCount = (usage.date === today ? usage.count : 0) + 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: newCount, date: today }));
  return newCount;
}

/** Simple markdown renderer: bold, bullet lists, line breaks */
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Empty line = spacing
    if (!line.trim()) {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // Bullet list item
    if (/^[-•*]\s/.test(line.trim())) {
      const content = line.trim().replace(/^[-•*]\s/, '');
      elements.push(
        <div key={i} className="flex gap-1.5 ml-1">
          <span className="text-gold mt-0.5 shrink-0">•</span>
          <span dangerouslySetInnerHTML={{ __html: boldify(content) }} />
        </div>
      );
      continue;
    }

    // Regular line with bold
    elements.push(
      <p key={i} dangerouslySetInnerHTML={{ __html: boldify(line) }} />
    );
  }

  return elements;
}

function boldify(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export function AdvisorChat() {
  const { user } = useAuth();
  const { isGold, tier } = useSubscription();
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageCount, setUsageCount] = useState(() => getUsageToday().count);
  const [showPricing, setShowPricing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = DAILY_LIMIT - usageCount;

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!user || !isGold || !text.trim() || loading || remaining <= 0) return;

    const userMsg: AdvisorMessage = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const { response } = await sendAdvisorMessage(user.id, text.trim(), messages);
      const assistantMsg: AdvisorMessage = { role: 'assistant', content: response };
      setMessages([...updatedMessages, assistantMsg]);
      const newCount = incrementUsage();
      setUsageCount(newCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col rounded-xl bg-surface border border-border overflow-hidden" style={{ maxHeight: '500px' }}>
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
        {messages.length === 0 && !loading ? (
          <div className="space-y-3">
            <p className="text-xs text-text-muted text-center mb-3">
              Ask anything about your portfolio and the precious metals market
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => isGold ? sendMessage(q) : setShowPricing(true)}
                  className="text-xs px-3 py-1.5 rounded-full border border-gold/30 text-gold hover:bg-gold/10 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gold text-background'
                      : 'bg-background border border-border text-text'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="space-y-1">{renderMarkdown(msg.content)}</div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-background border border-border rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-text-muted ml-1">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="text-center">
                <p className="text-xs text-red-400">{error}</p>
                <button
                  onClick={() => { setError(null); }}
                  className="text-xs text-gold mt-1 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-border p-3">
        {!isGold ? (
          <button
            onClick={() => setShowPricing(true)}
            className="w-full py-2.5 text-sm text-gold hover:text-gold-hover hover:underline transition-all cursor-pointer opacity-90 hover:opacity-100 text-center"
          >
            Try Gold Free for 7 Days to unlock AI Stack Advisor &rarr;
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-text-muted">
                {remaining <= 0 ? 'Daily limit reached. Resets at midnight.' : `${remaining} question${remaining === 1 ? '' : 's'} remaining today`}
              </span>
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 500))}
                onKeyDown={handleKeyDown}
                placeholder={remaining <= 0 ? 'Daily limit reached' : 'Ask about your portfolio...'}
                disabled={loading || remaining <= 0}
                className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm focus:border-gold focus:outline-none disabled:opacity-50 placeholder:text-text-muted/50"
              />
              <button
                type="submit"
                disabled={loading || remaining <= 0 || !input.trim()}
                className="px-3 py-2 bg-gold text-background rounded-lg hover:bg-gold-hover transition-colors disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </form>
          </>
        )}
      </div>

      <PricingModal
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
        currentTier={tier}
      />
    </div>
  );
}
