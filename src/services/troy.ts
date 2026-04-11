const API_BASE_URL = 'https://api.troystack.ai';

export interface TroyMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  preview?: TroyPreview | null;
}

export interface TroyConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface TroyConversation extends TroyConversationSummary {
  messages: TroyMessage[];
}

export type TroyPreviewType =
  | 'portfolio'
  | 'cost_basis'
  | 'chart'
  | 'purchasing_power'
  | 'dealer_link'
  | 'daily_brief'
  | 'signal_article';

export interface TroyPreview {
  type: TroyPreviewType;
  chartType?: 'ratio' | 'spot_price';
  data: Record<string, unknown> | null;
}

export interface SendMessageResponse {
  message: TroyMessage;
  title?: string;
  preview?: TroyPreview | null;
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function createConversation(userId: string, title?: string): Promise<TroyConversationSummary> {
  return jsonFetch(`${API_BASE_URL}/v1/troy/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...(title ? { title } : {}) }),
  });
}

export async function listConversations(userId: string): Promise<TroyConversationSummary[]> {
  const res = await jsonFetch<{ conversations?: TroyConversationSummary[] } | TroyConversationSummary[]>(
    `${API_BASE_URL}/v1/troy/conversations?userId=${encodeURIComponent(userId)}`,
  );
  if (Array.isArray(res)) return res;
  return res.conversations ?? [];
}

export async function getConversation(conversationId: string, userId: string): Promise<TroyConversation> {
  return jsonFetch(
    `${API_BASE_URL}/v1/troy/conversations/${conversationId}?userId=${encodeURIComponent(userId)}`,
  );
}

export async function deleteConversation(conversationId: string, userId: string): Promise<void> {
  await jsonFetch(
    `${API_BASE_URL}/v1/troy/conversations/${conversationId}?userId=${encodeURIComponent(userId)}`,
    { method: 'DELETE' },
  );
}

export async function sendMessage(
  conversationId: string,
  userId: string,
  message: string,
  signal?: AbortSignal,
): Promise<SendMessageResponse> {
  const res = await fetch(
    `${API_BASE_URL}/v1/troy/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message }),
      signal,
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function speak(text: string, userId: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}/v1/troy/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, userId }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `TTS failed: ${res.status}`);
  }
  return res.blob();
}

export interface ScanReceiptItem {
  description: string;
  quantity: number;
  unitPrice?: number;
  extPrice?: number;
  metal?: 'gold' | 'silver' | 'platinum' | 'palladium';
  ozt?: number;
}

export interface ScanReceiptResult {
  dealer?: string;
  purchaseDate?: string;
  purchaseTime?: string;
  items: ScanReceiptItem[];
}

export async function scanReceipt(base64Image: string, mimeType = 'image/jpeg'): Promise<ScanReceiptResult> {
  const raw = await jsonFetch<{ success?: boolean; data?: ScanReceiptResult } | ScanReceiptResult>(
    `${API_BASE_URL}/v1/scan-receipt`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image, mimeType }),
    },
  );
  if ('data' in raw && raw.data) return raw.data;
  return raw as ScanReceiptResult;
}
