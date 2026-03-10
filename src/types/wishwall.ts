// Approved message returned by GET /api/events/{id}/wishwall
// and broadcast via SignalR "MessageApproved" event
export interface WishwallMessage {
  id: string;
  userName: string;
  message: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  createdAt: string;
}

// Payload of SignalR "MessagePending" event (sent only to the author)
export interface WishwallPendingMessage {
  id: string;
  message: string;
  createdAt: string;
}

// Payload of SignalR "NewPendingMessage" event (sent to staff)
export interface WishwallStaffPending {
  id: string;
  message: string;
  sentiment: string;
  createdAt: string;
}
