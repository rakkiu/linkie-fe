import * as signalR from '@microsoft/signalr';
import axios from 'axios';
import type { PendingWishwallMessage, WishwallMessage } from '../types/wishwall';

// ── REST ──────────────────────────────────────────────────────────────────────

export const wishwallApi = {
  getMessages: (eventId: string) =>
    axios.get<{ data: WishwallMessage[] }>(`/api/events/${eventId}/wishwall`),

  sendMessage: (eventId: string, message: string) =>
    axios.post(
      `/api/events/${eventId}/wishwall`,
      { message },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
        },
      },
    ),

  approveMessage: (eventId: string, messageId: string) =>
    axios.patch(
      `/api/events/${eventId}/wishwall/${messageId}/approve`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
        },
      },
    ),

  getPendingMessages: (eventId: string) =>
    axios.get<{ data: PendingWishwallMessage[] }>(
      `/api/events/${eventId}/wishwall/pending`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
        },
      },
    ),

  displayOnLed: (eventId: string, messageId: string) =>
    axios.post(
      `/api/events/${eventId}/wishwall/${messageId}/display`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
        },
      },
    ),
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
