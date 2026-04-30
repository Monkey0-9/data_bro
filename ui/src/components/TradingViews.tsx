import { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useMultiSymbolData } from '../hooks/useMultiSymbolData';

interface TradingViewsProps {
  symbols: string[];
}

export const TradingViews: React.FC<TradingViewsProps> = ({ symbols }) => {
  const { data: chartData } = useMultiSymbolData(symbols);
  const chartRefs = useRef<{ [key: string]: IChartApi | null }>({});
  const seriesRefs = useRef<{ [key: string]: ISeriesApi<'Candlestick'> | null }>({});
  const containerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Initialize charts
  useEffect(() => {
    symbols.forEach((symbol) => {
      const container = containerRefs.current[symbol];
      if (!container) return;

      const chart = createChart(container, {
        width: container.clientWidth,
        height: 300,
        layout: {
          background: { color: '#0a0e17' },
          textColor: '#d1d5db',
        },
        grid: {
          vertLines: { color: '#1f2937' },
          horzLines: { color: '#1f2937' },
        },
        crosshair: {
          mode: 1,
          vertLine: { color: '#3b82f6', width: 1 },
          horzLine: { color: '#3b82f6', width: 1 },
        },
        rightPriceScale: {
          borderColor: '#374151',
        },
        timeScale: {
          borderColor: '#374151',
          timeVisible: true,
        },
      });

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });

      chartRefs.current[symbol] = chart;
      seriesRefs.current[symbol] = candlestickSeries;

      // Handle resize
      const handleResize = () => {
        if (container && chartRefs.current[symbol]) {
          chartRefs.current[symbol]!.applyOptions({
            width: container.clientWidth,
          });
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    });
  }, [symbols]);

  // Update chart data
  useEffect(() => {
    symbols.forEach((symbol) => {
      const series = seriesRefs.current[symbol];
      const data = chartData[symbol];
      if (series && data && data.length > 0) {
        series.setData(data);
      }
    });
  }, [chartData, symbols]);

  return (
    <div style={{ padding: '20px', background: '#0a0e17', minHeight: '100vh' }}>
      <h2 style={{ color: '#d1d5db', marginBottom: '20px', fontSize: '24px' }}>
        Multi-Symbol Trading Views
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '20px',
        }}
      >
        {symbols.map((symbol) => (
          <div
            key={symbol}
            style={{
              background: '#111827',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #374151',
            }}
          >
            <h3 style={{ color: '#60a5fa', marginBottom: '12px', fontSize: '18px' }}>
              {symbol}
            </h3>
            <div
              ref={(el) => (containerRefs.current[symbol] = el)}
              style={{ width: '100%', height: '300px' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
