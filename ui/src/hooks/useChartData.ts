import { useState, useEffect } from 'react';
import { CandlestickData, Time } from 'lightweight-charts';
import { useAuth } from '../contexts/AuthContext';

export function useChartData(symbol: string) {
  const { token } = useAuth();
  const [data, setData] = useState<CandlestickData<Time>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8003';
        // Fetch historical data from backtest service
        // For now, using mock data as fallback since QuestDB may not have data
        const response = await fetch(`${API_URL}/backtest/run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            symbol,
            start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            initial_capital: 100000,
            position_size: 10,
          }),
        });

        if (response.ok) {
          // If backtest works, we could derive chart data from trades
          // For now, using fallback mock data
        }
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      }

      // Fallback to mock data for demo
      const now = Math.floor(Date.now() / 1000);
      const mockData: CandlestickData<Time>[] = Array.from({ length: 50 }, (_, i) => {
        const time = (now - (50 - i) * 3600) as Time;
        const basePrice = 175 + Math.random() * 10;
        const open = basePrice;
        const high = open + Math.random() * 2;
        const low = open - Math.random() * 2;
        const close = low + Math.random() * (high - low);
        return { time, open, high, low, close };
      });

      setData(mockData);
      setLoading(false);
    };

    fetchData();
  }, [symbol, token]);

  return { data, loading };
}
