import { useEffect, useState } from 'react';

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: string;
}

export const AlertSystem: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    // Simulate incoming alerts
    const generateAlert = () => {
      const types: Alert['type'][] = ['info', 'warning', 'error', 'success'];
      const messages = [
        'RSI below 30 - potential buy signal for AAPL',
        'Portfolio VaR exceeded threshold',
        'Connection lost to signal service',
        'Position opened: GOOGL @ 175.50',
        'Stop loss triggered for TSLA',
        'New high detected in MSFT',
        'Sentiment shift negative for AMZN',
        'Strategy backtest completed: +12.5% ROI',
      ];

      const newAlert: Alert = {
        id: Date.now().toString(),
        type: types[Math.floor(Math.random() * types.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        timestamp: new Date().toLocaleTimeString(),
      };

      setAlerts((prev) => [newAlert, ...prev].slice(0, 10));
    };

    const interval = setInterval(generateAlert, 5000);
    return () => clearInterval(interval);
  }, []);

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'info':
        return '#3b82f6';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      case 'success':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        width: '350px',
        zIndex: 1000,
      }}
    >
      <h3 style={{ color: '#d1d5db', marginBottom: '12px', fontSize: '16px' }}>
        Alerts
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {alerts.map((alert) => (
          <div
            key={alert.id}
            style={{
              background: '#111827',
              border: `1px solid ${getAlertColor(alert.type)}`,
              borderRadius: '8px',
              padding: '12px',
              position: 'relative',
            }}
          >
            <button
              onClick={() => dismissAlert(alert.id)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              ×
            </button>
            <div
              style={{
                color: getAlertColor(alert.type),
                fontSize: '12px',
                fontWeight: 'bold',
                marginBottom: '4px',
              }}
            >
              {alert.type.toUpperCase()}
            </div>
            <div style={{ color: '#d1d5db', fontSize: '13px', marginBottom: '4px' }}>
              {alert.message}
            </div>
            <div style={{ color: '#6b7280', fontSize: '11px' }}>{alert.timestamp}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
