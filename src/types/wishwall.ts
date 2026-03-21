// Approved message returned by GET /api/events/{id}/wishwall
// and broadcast via SignalR "MessageApproved" event
export interface WishwallMessage {
  id: string;
  userName: string;
  message: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  createdAt: string;
}

export type AiLabel = 'ALLOW' | 'REVIEW' | 'BLOCK';

// Payload of SignalR "MessagePending" event (sent only to the author)
export interface WishwallPendingMessage {
  id: string;
  message: string;
  createdAt: string;
}

// Payload of SignalR "NewPendingMessage" event (sent to staff)
export interface WishwallStaffPending {
  id: string;
  userName: string;
  message: string;
  sentiment: string;
  createdAt: string;
  aiLabel?: AiLabel | null;
  aiReason?: string | null;
}

// Item returned by GET /api/events/{id}/wishwall/pending
export interface PendingWishwallMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  sentiment: string;
  createdAt: string;
  aiLabel?: AiLabel | null;
  aiReason?: string | null;
}

// Payload of SignalR "LedDisplay" event
export interface LedDisplayMessage {
  id: string;
  userName: string;
  message: string;
  sentiment: string;
  createdAt: string;
}

export interface WishwallAiLog {
  messageId: string;
  message: string;
  label: AiLabel;
  reason: string;
  source: 'fast' | 'gemini' | 'fallback';
  durationMs: number;
  createdAt: string;
}
