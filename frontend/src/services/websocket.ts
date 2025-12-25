import { WSMessage } from '@state/network/types';

const WS_BASE = (import.meta.env.VITE_WS_BASE as string) || 'ws://localhost:8080';

export function connectToSession(
  sessionId: string,
  token: string,
  onMessage: (payload: WSMessage) => void,
): WebSocket {
  const url = `${WS_BASE}/api/ws?session=${sessionId}&token=${token}`;
  const ws = new WebSocket(url);
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as WSMessage;
      onMessage(data);
    } catch (err) {
      console.error('Не удалось разобрать данные WebSocket', err);
    }
  };
  return ws;
}
