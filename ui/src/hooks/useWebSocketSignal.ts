import { useEffect, useRef } from 'react';
import { useSignalStore } from '../store/signalStore';
import { useAuth } from '../contexts/AuthContext';

export function useWebSocketSignal() {
  const { token } = useAuth();
  const { setSignal, setLoading, setError, signal } = useSignalStore();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) return;
    
    setLoading(true);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
    const ws = new WebSocket(`${API_URL.replace('http', 'ws')}/ws/signals?token=${token}`);
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
  }, [setSignal, setLoading, setError]);

  return wsRef;
}
