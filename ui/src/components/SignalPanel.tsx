import { useSignalStore } from '../store/signalStore';

export function SignalPanel() {
  const { signal, loading, error } = useSignalStore();

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: '30px',
    left: '30px',
    zIndex: 1,
    background: 'rgba(15, 20, 30, 0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
    width: '320px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    color: 'white',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  };

  const headerStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '24px',
    fontWeight: 700,
    letterSpacing: '2px',
    background: 'linear-gradient(90deg, #00ffcc, #0088ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };

  const subHeaderStyle: React.CSSProperties = {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#8892b0',
  };

  const dividerStyle: React.CSSProperties = {
    width: '100%',
    height: '1px',
    background: 'rgba(255,255,255,0.1)',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
  };

  const labelStyle: React.CSSProperties = {
    color: '#8892b0',
  };

  const valueStyle: React.CSSProperties = {
    fontWeight: 600,
  };

  const actionBoxStyle = (action: string): React.CSSProperties => ({
    marginTop: '8px',
    padding: '12px',
    background: 'rgba(0,0,0,0.4)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'center',
    color:
      action === 'ENTER_LONG'
        ? '#00ffcc'
        : action === 'ENTER_SHORT'
          ? '#ff3366'
          : '#ffd700',
  });

  if (error) {
    return (
      <div style={panelStyle}>
        <h1 style={headerStyle}>NEXUS</h1>
        <div style={subHeaderStyle}>Spatial Intelligence Terminal</div>
        <div style={dividerStyle} />
        <div style={{ color: '#ff3366', fontSize: '14px' }}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <h1 style={headerStyle}>NEXUS</h1>
      <div style={subHeaderStyle}>Spatial Intelligence Terminal</div>
      <div style={dividerStyle} />

      {loading && !signal ? (
        <div style={{ color: '#8892b0', fontSize: '14px', fontStyle: 'italic' }}>Loading signal...</div>
      ) : signal ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={rowStyle}>
            <span style={labelStyle}>Symbol</span>
            <span style={valueStyle}>{signal.symbol}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Price</span>
            <span style={valueStyle}>${signal.price.toFixed(2)}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Sentiment</span>
            <span
              style={{
                ...valueStyle,
                color: signal.sentiment_score > 0 ? '#00ffcc' : '#ff3366',
              }}
            >
              {(signal.sentiment_score * 100).toFixed(1)}%
            </span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Momentum</span>
            <span
              style={{
                ...valueStyle,
                color: signal.momentum_signal === 'BUY' ? '#00ffcc' : signal.momentum_signal === 'SELL' ? '#ff3366' : '#ffd700',
              }}
            >
              {signal.momentum_signal} ({(signal.confidence * 100).toFixed(0)}%)
            </span>
          </div>
          <div style={actionBoxStyle(signal.suggested_action)}>
            <span style={{ fontSize: '11px', color: '#8892b0', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Action
            </span>
            <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>
              {signal.suggested_action}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ color: '#8892b0', fontSize: '14px', fontStyle: 'italic' }}>Awaiting data stream...</div>
      )}
    </div>
  );
}
