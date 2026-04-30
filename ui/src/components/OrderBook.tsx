import { useEffect, useState } from 'react';

interface OrderLevel {
  price: number;
  size: number;
  total: number;
}

interface OrderBookProps {
  symbol: string;
}

function generateStaticOrderBook(basePrice: number): { bids: OrderLevel[]; asks: OrderLevel[] } {
  const bids: OrderLevel[] = [];
  const asks: OrderLevel[] = [];
  const sizes = [450, 320, 180, 520, 210, 390, 150, 480, 280, 340];

  for (let i = 0; i < 10; i++) {
    const bidPrice = basePrice - (i * 0.01);
    const askPrice = basePrice + (i * 0.01);
    const size = sizes[i];

    bids.push({ price: bidPrice, size, total: size });
    asks.push({ price: askPrice, size, total: size });
  }

  return { bids, asks };
}

export const OrderBook: React.FC<OrderBookProps> = ({ symbol }) => {
  const [bids, setBids] = useState<OrderLevel[]>([]);
  const [asks, setAsks] = useState<OrderLevel[]>([]);

  useEffect(() => {
    // Generate static order book once — no re-randomization
    const basePrice = 175.0;
    const { bids: staticBids, asks: staticAsks } = generateStaticOrderBook(basePrice);
    setBids(staticBids);
    setAsks(staticAsks);
  }, [symbol]);

  const maxTotal = Math.max(
    ...bids.map((b) => b.total),
    ...asks.map((a) => a.total)
  );

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
          Order Book - {symbol}
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
      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Bids */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: '#9ca3af',
              fontSize: '12px',
              marginBottom: '8px',
            }}
          >
            <span>Price</span>
            <span>Size</span>
            <span>Total</span>
          </div>
          {bids.map((bid, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 8px',
                background: `rgba(16, 185, 129, ${bid.total / maxTotal * 0.3})`,
                borderRadius: '4px',
                marginBottom: '2px',
                color: '#10b981',
                fontSize: '13px',
              }}
            >
              <span>{bid.price.toFixed(2)}</span>
              <span>{bid.size}</span>
              <span>{bid.total}</span>
            </div>
          ))}
        </div>

        {/* Asks */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: '#9ca3af',
              fontSize: '12px',
              marginBottom: '8px',
            }}
          >
            <span>Price</span>
            <span>Size</span>
            <span>Total</span>
          </div>
          {asks.map((ask, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 8px',
                background: `rgba(239, 68, 68, ${ask.total / maxTotal * 0.3})`,
                borderRadius: '4px',
                marginBottom: '2px',
                color: '#ef4444',
                fontSize: '13px',
              }}
            >
              <span>{ask.price.toFixed(2)}</span>
              <span>{ask.size}</span>
              <span>{ask.total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
