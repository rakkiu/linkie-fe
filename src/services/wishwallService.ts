import * as signalR from '@microsoft/signalr';
import axiosInstance from '../lib/axios';
import type { PendingWishwallMessage, WishwallMessage } from '../types/wishwall';

// ── REST ──────────────────────────────────────────────────────────────────────

export const wishwallApi = {
  getMessages: (eventId: string) =>
    axiosInstance.get<{ data: WishwallMessage[] }>(`/api/events/${eventId}/wishwall`),

  sendMessage: (eventId: string, message: string) =>
    axiosInstance.post(`/api/events/${eventId}/wishwall`, { message }),

  approveMessage: (eventId: string, messageId: string) =>
    axiosInstance.patch(`/api/events/${eventId}/wishwall/${messageId}/approve`, {}),

  getPendingMessages: (eventId: string) =>
    axiosInstance.get<{ data: PendingWishwallMessage[] }>(
      `/api/events/${eventId}/wishwall/pending`,
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
  return new signalR.HubConnectionBuilder()
    .withUrl('/hubs/wishwall', {
      // Pass JWT via query string — required for WebSocket transport
      accessTokenFactory: () => localStorage.getItem('access_token') ?? '',
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Warning)
    .build();
}
