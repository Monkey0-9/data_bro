import React, { useState } from 'react';

export function PlatformPlumbing() {
  const [activeBroker, setActiveBroker] = useState('Bloomberg');

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '30px',
    right: '30px',
    zIndex: 10,
    background: 'rgba(10, 15, 25, 0.75)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '20px',
    width: '300px',
    color: '#e2e8f0',
    fontFamily: '"Inter", sans-serif',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    color: '#94a3b8',
    marginBottom: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const statusDot: React.CSSProperties = {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#10b981',
    boxShadow: '0 0 8px #10b981'
  };

  const buttonStyle = (isActive: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '10px 15px',
    background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
    border: `1px solid ${isActive ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255,255,255,0.05)'}`,
    borderRadius: '6px',
    color: isActive ? '#60a5fa' : '#94a3b8',
    textAlign: 'left',
    fontSize: '13px',
    cursor: 'pointer',
    marginBottom: '8px',
    transition: 'all 0.2s ease',
    display: 'flex',
    justifyContent: 'space-between'
  });

  const sources = [
    { id: 'Bloomberg', type: 'Institutional' },
    { id: 'Zerodha API', type: 'Retail DMA' },
    { id: 'Sigma Dark Pool', type: 'Off-Exchange' },
    { id: 'Satellite Orbit #4', type: 'Raw Feed' }
  ];

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>
        <span>Financial Plumbing</span>
        <div style={statusDot} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {sources.map(source => (
          <button 
            key={source.id} 
            onClick={() => setActiveBroker(source.id)}
            style={buttonStyle(activeBroker === source.id)}
          >
            <span>{source.id}</span>
            <span style={{ fontSize: '10px', opacity: 0.6 }}>{source.type}</span>
          </button>
        ))}
      </div>
      <div style={{ marginTop: '10px', fontSize: '10px', color: '#64748b', textAlign: 'center' }}>
        Agnostic Data Pipeline Active
      </div>
    </div>
  );
}
