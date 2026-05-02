import React, { useEffect, useState } from 'react';

export function InsightEngine() {
  const [fheStatus, setFheStatus] = useState('Encrypting...');
  const [sentiment, setSentiment] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSentiment(Math.random() * 100);
      setFheStatus(Math.random() > 0.5 ? 'CKKS Polynomial OK' : 'FHE Query Active');
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '30px',
    left: '30px',
    zIndex: 10,
    background: 'rgba(10, 15, 25, 0.75)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '20px',
    width: '350px',
    color: '#e2e8f0',
    fontFamily: '"Inter", sans-serif',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
  };

  const headerStyle: React.CSSProperties = {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    color: '#38bdf8',
    marginBottom: '15px',
    borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
    paddingBottom: '8px'
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    marginBottom: '10px'
  };

  const labelStyle: React.CSSProperties = {
    color: '#94a3b8'
  };

  const valStyle = (color: string): React.CSSProperties => ({
    color: color,
    fontWeight: 600,
    textShadow: `0 0 10px ${color}40`
  });

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>Real-Time Insight Engine</div>
      
      <div style={rowStyle}>
        <span style={labelStyle}>Global Sentiment</span>
        <span style={valStyle(sentiment > 50 ? '#10b981' : '#f43f5e')}>
          {sentiment.toFixed(2)}%
        </span>
      </div>
      
      <div style={rowStyle}>
        <span style={labelStyle}>Satellite Imagery Analysis</span>
        <span style={valStyle('#a855f7')}>Port Traffic: HIGH</span>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>Homomorphic Encryption</span>
        <span style={valStyle('#facc15')}>{fheStatus}</span>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>Quantum RL Model</span>
        <span style={valStyle('#38bdf8')}>Evolving (Gen 42)</span>
      </div>
      
      <div style={{ marginTop: '15px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${sentiment}%`, height: '100%', background: sentiment > 50 ? '#10b981' : '#f43f5e', transition: 'width 1s ease-in-out' }} />
      </div>
    </div>
  );
}
