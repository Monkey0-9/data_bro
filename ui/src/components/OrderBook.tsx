import { useEffect, useState } from 'react';

interface OrderLevel {
  price: number;
  size: number;
  total: number;
}

interface OrderBookProps {
  symbol: string;
}

export const OrderBook: React.FC<OrderBookProps> = ({ symbol }) => {
  const [bids, setBids] = useState<OrderLevel[]>([]);
  const [asks, setAsks] = useState<OrderLevel[]>([]);

  useEffect(() => {
    // Generate mock order book data
    const generateOrderBook = () => {
      const basePrice = 175.0;
      const newBids: OrderLevel[] = [];
      const newAsks: OrderLevel[] = [];

      for (let i = 0; i < 10; i++) {
        const bidPrice = basePrice - (i * 0.01);
        const askPrice = basePrice + (i * 0.01);
        const bidSize = Math.floor(Math.random() * 1000) + 100;
        const askSize = Math.floor(Math.random() * 1000) + 100;

        newBids.push({
          price: bidPrice,
          size: bidSize,
          total: bidSize,
        });

        newAsks.push({
          price: askPrice,
          size: askSize,
          total: askSize,
        });
      }

      setBids(newBids);
      setAsks(newAsks);
    };

    generateOrderBook();
    const interval = setInterval(generateOrderBook, 1000);

    return () => clearInterval(interval);
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
      <h3 style={{ color: '#60a5fa', marginBottom: '12px', fontSize: '16px' }}>
        Order Book - {symbol}
      </h3>
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
