import { useEffect, useRef } from 'react';
import { useSignalStore } from '../store/signalStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8001/ws/signals';

export function useWebSocketSignal() {
  const { setSignal, setLoading, setError, signal } = useSignalStore();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setLoading(true);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setLoading(false);
      setError(null);
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setSignal(data);
      } catch (e) {
        console.error('Failed to parse WebSocket message', e);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error', err);
      setError('WebSocket connection error');
    };

    ws.onclose = () => {
      setError('WebSocket disconnected');
    };

    // Fallback polling if WebSocket fails immediately
    const fallbackInterval = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN && !signal) {
        setError('Attempting to reconnect...');
      }
    }, 3000);

    return () => {
      clearInterval(fallbackInterval);
      ws.close();
    };
  }, [setSignal, setLoading, setError, signal]);

  return wsRef;
}
