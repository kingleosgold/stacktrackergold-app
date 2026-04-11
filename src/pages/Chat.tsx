import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  createConversation,
  getConversation,
  sendMessage,
  scanReceipt,
  type TroyMessage,
} from '../services/troy';
import { MessageBubble } from '../components/chat/MessageBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { SuggestionChips } from '../components/chat/SuggestionChips';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { ImportPreviewModal, type ParsedRow } from '../components/chat/ImportPreviewModal';
import { parseSpreadsheet } from '../lib/parseSpreadsheet';
import { useHoldings } from '../hooks/useHoldings';
import type { Metal } from '../types/holding';

const CENTER_SUGGESTIONS = [
  "Today's Brief",
  "How's my stack?",
  'Gold/Silver Ratio',
  'Purchasing Power',
];

const INLINE_SUGGESTIONS = ["Today's Brief", 'My stack', 'Ratio', 'Buying power'];

interface OutletCtx {
  refreshConversations: () => Promise<void>;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] ?? result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ conversationId?: string }>();
  const ctx = useOutletContext<OutletCtx | null>();
  const { addHolding } = useHoldings();

  const [messages, setMessages] = useState<TroyMessage[]>([]);
  const [loadingConv, setLoadingConv] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<{ rows: ParsedRow[]; source: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationId = params.conversationId ?? null;

  // Load conversation
  useEffect(() => {
    if (!conversationId || !user) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingConv(true);
    getConversation(conversationId, user.id)
      .then((conv) => {
        if (cancelled) return;
        setMessages(conv.messages ?? []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load conversation');
      })
      .finally(() => {
        if (!cancelled) setLoadingConv(false);
      });
    return () => { cancelled = true; };
  }, [conversationId, user]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const handleSend = useCallback(async (text: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setError(null);

    let convId = conversationId;
    // Create conversation on first message if we don't have one
    if (!convId) {
      try {
        const conv = await createConversation(user.id);
        convId = conv.id;
        navigate(`/c/${conv.id}`, { replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to start conversation');
        return;
      }
    }

    // Optimistic user message
    const userMsg: TroyMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setSending(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await sendMessage(convId, user.id, text, controller.signal);
      const troyMsg: TroyMessage = {
        ...res.message,
        preview: res.preview ?? null,
      };
      setMessages((prev) => [...prev, troyMsg]);
      ctx?.refreshConversations();
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        // user cancelled — leave messages as-is
      } else {
        setError(e instanceof Error ? e.message : 'Send failed');
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }, [user, navigate, conversationId, ctx]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handlePhoto = useCallback(async (file: File) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setError(null);
    setSending(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await scanReceipt(base64, file.type || 'image/jpeg');
      const itemCount = result.items?.length ?? 0;
      if (itemCount === 0) {
        setError('No items detected in receipt.');
        return;
      }
      const rows: ParsedRow[] = result.items.map((it) => ({
        description: it.description,
        metal: it.metal as Metal | undefined,
        weight: it.ozt,
        quantity: it.quantity,
        purchasePrice: it.unitPrice ?? it.extPrice,
        purchaseDate: result.purchaseDate,
      }));
      setImportPreview({ rows, source: `Receipt from ${result.dealer ?? 'dealer'}` });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Receipt scan failed');
    } finally {
      setSending(false);
    }
  }, [user, navigate]);

  const handleSpreadsheet = useCallback(async (file: File) => {
    setError(null);
    try {
      const rows = await parseSpreadsheet(file);
      setImportPreview({ rows, source: file.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse spreadsheet');
    }
  }, []);

  const handleConfirmImport = useCallback(async () => {
    if (!importPreview) return;
    setImporting(true);
    setImportError(null);
    try {
      for (const row of importPreview.rows) {
        if (!row.metal || !row.weight || !row.quantity) continue;
        await addHolding({
          metal: row.metal,
          type: row.description || 'Other',
          weight: row.weight,
          weightUnit: 'oz',
          quantity: row.quantity,
          purchasePrice: row.purchasePrice ?? 0,
          purchaseDate: row.purchaseDate || new Date().toISOString().slice(0, 10),
        });
      }
      setImportPreview(null);
      // Drop a synthetic Troy message acknowledging the import
      const ackMsg: TroyMessage = {
        id: `local-ack-${Date.now()}`,
        role: 'assistant',
        content: `Added ${importPreview.rows.length} item(s) to your stack from ${importPreview.source}.`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, ackMsg]);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }, [importPreview, addHolding]);

  const isEmpty = messages.length === 0 && !loadingConv && !sending;
  const userId = user?.id ?? '';

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen" style={{ background: '#0A0A0E' }}>
      {/* Desktop header */}
      <div className="hidden lg:flex items-center gap-3 px-6 py-4 border-b border-white/5">
        <img src="/troy-avatar.png" alt="Troy" className="w-9 h-9 rounded-full" />
        <div>
          <div className="text-sm font-semibold text-[#DAA520]">Troy</div>
          <div className="text-[11px] text-text-muted">Your Stack Analyst</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-4">
        {loadingConv && (
          <div className="text-center text-xs text-text-muted py-8">Loading conversation…</div>
        )}

        {isEmpty && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
            <img src="/troy-avatar.png" alt="Troy" className="w-24 h-24 rounded-full mb-5" />
            <h1 className="text-2xl font-semibold text-[#DAA520] mb-1">Ask Troy anything</h1>
            <p className="text-sm text-text-muted mb-8">Your stack. Your questions. One chat away.</p>
            <SuggestionChips
              suggestions={CENTER_SUGGESTIONS}
              onSelect={handleSend}
              variant="stacked"
              disabled={sending}
            />
          </div>
        )}

        {!isEmpty && messages.map((m) => (
          <MessageBubble key={m.id} message={m} userId={userId} />
        ))}

        {sending && (
          <div className="flex gap-2.5 px-4">
            <img src="/troy-avatar.png" alt="Troy" className="w-7 h-7 rounded-full shrink-0 mt-1" />
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-md">
              <TypingIndicator />
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-white/5 px-4 py-3 pb-5">
        {!isEmpty && (
          <SuggestionChips
            suggestions={INLINE_SUGGESTIONS}
            onSelect={handleSend}
            variant="inline"
            disabled={sending}
          />
        )}
        {error && (
          <div className="mb-2 text-xs text-[#EF4444] flex items-center justify-between px-1">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-text-muted hover:text-text">×</button>
          </div>
        )}
        <ChatInput
          onSend={handleSend}
          onStop={handleStop}
          onPhoto={handlePhoto}
          onSpreadsheet={handleSpreadsheet}
          loading={sending}
        />
      </div>

      {importPreview && (
        <ImportPreviewModal
          title={`Import from ${importPreview.source}`}
          rows={importPreview.rows}
          onConfirm={handleConfirmImport}
          onCancel={() => { setImportPreview(null); setImportError(null); }}
          loading={importing}
          error={importError}
        />
      )}
    </div>
  );
}
