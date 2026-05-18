import * as signalR from '@microsoft/signalr';
import axiosInstance from '../lib/axios';
import type { PendingWishwallMessage, WishwallAiLog, WishwallMessage } from '../types/wishwall';

// ── REST ──────────────────────────────────────────────────────────────────────

export const wishwallApi = {
  getMessages: (eventId: string) =>
    axiosInstance.get<{ data: WishwallMessage[] }>(`/api/events/${eventId}/wishwall`),

  sendMessage: (eventId: string, message: string) =>
    axiosInstance.post(`/api/events/${eventId}/wishwall`, { message }),

  approveMessage: (eventId: string, messageId: string, sentiment: string = 'Neutral') =>
    axiosInstance.patch(`/api/events/${eventId}/wishwall/${messageId}/approve?sentiment=${sentiment}`, {}),

  rejectMessage: (eventId: string, messageId: string) =>
    axiosInstance.patch(`/api/events/${eventId}/wishwall/${messageId}/reject`, {}),

  getPendingMessages: (eventId: string) =>
    axiosInstance.get<{ data: PendingWishwallMessage[] }>(
      `/api/events/${eventId}/wishwall/pending`,
    ),

  getAiLogs: (eventId: string, take: number = 200) =>
    axiosInstance.get<{ data: WishwallAiLog[] }>(
      `/api/admin/events/${eventId}/wishwall/ai-logs?take=${take}`,
    ),

  displayOnLed: (eventId: string, messageId: string) =>
    axiosInstance.post(`/api/events/${eventId}/wishwall/${messageId}/display`, {}),
};

// ── SignalR Hub connection ────────────────────────────────────────────────────

/**
 * Creates (but does NOT start) a SignalR connection to the Wishwall hub.
 * The caller is responsible for starting, joining groups, and stopping.
 */
export function createWishwallConnection(): signalR.HubConnection {
  const hubUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5002') + '/hubs/wishwall';
  return new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      // Pass JWT via query string — required for WebSocket transport
      accessTokenFactory: () => localStorage.getItem('access_token') ?? '',
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Warning)
    .build();
}
