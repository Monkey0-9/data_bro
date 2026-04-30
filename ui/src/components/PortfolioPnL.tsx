import { useEffect, useState } from 'react';

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

export const PortfolioPnL: React.FC<PortfolioPnLProps> = ({ initialCapital = 100000 }) => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [totalPnL, setTotalPnL] = useState(0);
  const [totalPnLPercent, setTotalPnLPercent] = useState(0);

  useEffect(() => {
    // Generate mock portfolio data
    const generatePortfolio = () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
      const newPositions: Position[] = symbols.map((symbol) => {
        const entryPrice = 150 + Math.random() * 100;
        const currentPrice = entryPrice * (1 + (Math.random() - 0.5) * 0.1);
        const quantity = Math.floor(Math.random() * 100) + 10;
        const pnl = (currentPrice - entryPrice) * quantity;
        const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

        return {
          symbol,
          quantity,
          entryPrice,
          currentPrice,
          pnl,
          pnlPercent,
        };
      });

      setPositions(newPositions);

      const total = newPositions.reduce((sum, pos) => sum + pos.pnl, 0);
      setTotalPnL(total);
      setTotalPnLPercent((total / initialCapital) * 100);
    };

    generatePortfolio();
    const interval = setInterval(generatePortfolio, 2000);

    return () => clearInterval(interval);
  }, [initialCapital]);

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
      <h3 style={{ color: '#60a5fa', marginBottom: '12px', fontSize: '16px' }}>
        Portfolio P&L
      </h3>

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
