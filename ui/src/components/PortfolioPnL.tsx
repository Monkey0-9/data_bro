import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Position {
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

interface PortfolioPnLProps {
  initialCapital: number;
}

// Generate static demo data once — not re-randomized
function generateDemoPositions(): Position[] {
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
  const basePrices: Record<string, number> = {
    AAPL: 175.25, GOOGL: 142.80, MSFT: 380.50, AMZN: 178.35, TSLA: 242.60,
  };
  return symbols.map((symbol) => {
    const entryPrice = basePrices[symbol];
    const currentPrice = entryPrice * (1 + (Math.random() - 0.5) * 0.02); // Very small daily drift
    const quantity = Math.floor(Math.random() * 50) + 10;
    const pnl = (currentPrice - entryPrice) * quantity;
    const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
    return { symbol, quantity, entryPrice, currentPrice, pnl, pnlPercent };
  });
}

export const PortfolioPnL: React.FC<PortfolioPnLProps> = ({ initialCapital = 100000 }) => {
  const { token } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [totalPnL, setTotalPnL] = useState(0);
  const [totalPnLPercent, setTotalPnLPercent] = useState(0);

  useEffect(() => {
    if (!token) return;

    // Generate demo data once on mount — no re-randomization interval
    const demoPositions = generateDemoPositions();
    setPositions(demoPositions);
    const total = demoPositions.reduce((sum, pos) => sum + pos.pnl, 0);
    setTotalPnL(total);
    setTotalPnLPercent((total / initialCapital) * 100);
  }, [initialCapital, token]);

  return (
    <div
      style={{
        background: '#111827',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #374151',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ color: '#60a5fa', fontSize: '16px', margin: 0 }}>
          Portfolio P&L
        </h3>
        <span
          style={{
            background: '#f59e0b',
            color: '#000',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px 8px',
            borderRadius: '4px',
            textTransform: 'uppercase',
          }}
        >
          DEMO / MOCK DATA
        </span>
      </div>

      {/* Summary */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '12px',
          background: '#1f2937',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ color: '#9ca3af', fontSize: '12px' }}>Total P&L</div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: totalPnL >= 0 ? '#10b981' : '#ef4444',
            }}
          >
            ${totalPnL.toFixed(2)}
          </div>
        </div>
        <div>
          <div style={{ color: '#9ca3af', fontSize: '12px' }}>Return %</div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: totalPnLPercent >= 0 ? '#10b981' : '#ef4444',
            }}
          >
            {totalPnLPercent.toFixed(2)}%
          </div>
        </div>
        <div>
          <div style={{ color: '#9ca3af', fontSize: '12px' }}>Capital</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d1d5db' }}>
            ${(initialCapital + totalPnL).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
            padding: '8px',
            borderBottom: '1px solid #374151',
            marginBottom: '8px',
          }}
        >
          <span>Symbol</span>
          <span>Qty</span>
          <span>Entry</span>
          <span>Current</span>
          <span>P&L</span>
        </div>
        {positions.map((pos, idx) => (
          <div
            key={idx}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
              padding: '8px',
              borderBottom: '1px solid #1f2937',
            }}
          >
            <span style={{ color: '#d1d5db' }}>{pos.symbol}</span>
            <span>{pos.quantity}</span>
            <span>${pos.entryPrice.toFixed(2)}</span>
            <span>${pos.currentPrice.toFixed(2)}</span>
            <span
              style={{
                color: pos.pnl >= 0 ? '#10b981' : '#ef4444',
                fontWeight: 'bold',
              }}
            >
              ${pos.pnl.toFixed(2)} ({pos.pnlPercent.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
