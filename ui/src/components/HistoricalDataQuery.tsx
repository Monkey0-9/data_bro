import { useState } from 'react';
import { CandlestickData, Time } from 'lightweight-charts';

interface HistoricalDataQueryProps {
  onDataLoaded: (symbol: string, data: CandlestickData<Time>[]) => void;
}

export const HistoricalDataQuery: React.FC<HistoricalDataQueryProps> = ({ onDataLoaded }) => {
  const [symbol, setSymbol] = useState('AAPL');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleQuery = async () => {
    setLoading(true);
    setError('');

    try {
      // In production, this would call the backtest API
      // For now, generate mock data
      const basePrice = 150 + (symbol.length * 10);
      const start = new Date(startDate).getTime() / 1000;
      const end = new Date(endDate).getTime() / 1000;
      const days = Math.floor((end - start) / 86400);

      const data: CandlestickData<Time>[] = Array.from({ length: Math.min(days, 100) }, (_, i) => ({
        time: (start + i * 86400) as Time,
        open: basePrice + Math.random() * 20,
        high: basePrice + Math.random() * 30,
        low: basePrice - Math.random() * 20,
        close: basePrice + Math.random() * 20,
      }));

      onDataLoaded(symbol, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch historical data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: '#111827',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #374151',
        width: '100%',
      }}
    >
      <h3 style={{ color: '#60a5fa', marginBottom: '16px', fontSize: '18px' }}>
        Historical Data Query
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div>
          <label style={{ color: '#9ca3af', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Symbol
          </label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            style={{
              width: '100%',
              padding: '8px',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '4px',
              color: '#d1d5db',
            }}
          />
        </div>

        <div>
          <label style={{ color: '#9ca3af', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '4px',
              color: '#d1d5db',
            }}
          />
        </div>

        <div>
          <label style={{ color: '#9ca3af', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '4px',
              color: '#d1d5db',
            }}
          />
        </div>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            padding: '8px',
            borderRadius: '4px',
            marginBottom: '12px',
            fontSize: '12px',
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleQuery}
        disabled={loading}
        style={{
          padding: '10px 20px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          width: '100%',
        }}
      >
        {loading ? 'Loading...' : 'Query Data'}
      </button>
    </div>
  );
};
