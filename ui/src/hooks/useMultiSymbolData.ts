import { useEffect, useState } from 'react';
import { CandlestickData, Time } from 'lightweight-charts';

interface SymbolData {
  [symbol: string]: CandlestickData<Time>[];
}

export const useMultiSymbolData = (symbols: string[]) => {
  const [data, setData] = useState<SymbolData>({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8001/ws/signals';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected for multi-symbol data');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.symbol && message.price) {
        setData((prev) => {
          const symbolData = prev[message.symbol] || [];
          const newCandle: CandlestickData<Time> = {
            time: (Math.floor(Date.now() / 1000)) as Time,
            open: message.price,
            high: message.price * 1.001,
            low: message.price * 0.999,
            close: message.price,
          };
          
          // Keep last 100 candles
          const updated = [...symbolData, newCandle].slice(-100);
          return { ...prev, [message.symbol]: updated };
        });
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    };

    return () => ws.close();
  }, []);

  // Initialize with mock data for all symbols
  useEffect(() => {
    if (Object.keys(data).length === 0) {
      const mockData: SymbolData = {};
      symbols.forEach((symbol, idx) => {
        const basePrice = 150 + idx * 50;
        mockData[symbol] = Array.from({ length: 50 }, (_, i) => ({
          time: (1714022400 + i * 60) as Time,
          open: basePrice + Math.random() * 10,
          high: basePrice + Math.random() * 15,
          low: basePrice - Math.random() * 10,
          close: basePrice + Math.random() * 10,
        }));
      });
      setData(mockData);
    }
  }, [symbols, data]);

  return { data, connected };
};
