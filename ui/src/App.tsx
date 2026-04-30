import { useWebSocketSignal } from './hooks/useWebSocketSignal';
import { SceneCanvas } from './components/SceneCanvas';
import { SignalPanel } from './components/SignalPanel';
import { TradingChart } from './components/TradingChart';
import { TradingViews } from './components/TradingViews';
import { CandlestickData, Time } from 'lightweight-charts';
import { useState } from 'react';

export default function App() {
  useWebSocketSignal();
  const [showMultiView, setShowMultiView] = useState(false);

  // Mock candlestick data for single chart
  const chartData: CandlestickData<Time>[] = [
    { time: 1714022400 as Time, open: 175.25, high: 175.40, low: 175.20, close: 175.30 },
    { time: 1714022460 as Time, open: 175.30, high: 175.50, low: 175.25, close: 175.45 },
    { time: 1714022520 as Time, open: 175.45, high: 175.60, low: 175.35, close: 175.55 },
    { time: 1714022580 as Time, open: 175.55, high: 175.70, low: 175.40, close: 175.65 },
    { time: 1714022640 as Time, open: 175.65, high: 175.80, low: 175.50, close: 175.75 },
  ];

  // Multi-symbol list
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA'];

  if (showMultiView) {
    return (
      <div>
        <button
          onClick={() => setShowMultiView(false)}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '10px 20px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            zIndex: 1000,
          }}
        >
          Back to 3D View
        </button>
        <TradingViews symbols={symbols} />
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <SceneCanvas />
      <SignalPanel />
      <button
        onClick={() => setShowMultiView(true)}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '10px 20px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        Multi-Symbol Charts
      </button>
      <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20, zIndex: 10 }}>
        <TradingChart symbol="AAPL" data={chartData} />
      </div>
    </div>
  );
}
