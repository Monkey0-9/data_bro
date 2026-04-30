import { useWebSocketSignal } from './hooks/useWebSocketSignal';
import { useChartData } from './hooks/useChartData';
import { SceneCanvas } from './components/SceneCanvas';
import { SignalPanel } from './components/SignalPanel';
import { TradingChart } from './components/TradingChart';
import { TradingViews } from './components/TradingViews';
import { AuthFlow } from './components/AuthFlow';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useState } from 'react';

function ProtectedApp() {
  const { isAuthenticated, login } = useAuth();
  useWebSocketSignal();
  const [showMultiView, setShowMultiView] = useState(false);
  const { data: chartData } = useChartData('AAPL');

  if (!isAuthenticated) {
    return <AuthFlow onLogin={login} />;
  }

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

export default function App() {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  );
}
