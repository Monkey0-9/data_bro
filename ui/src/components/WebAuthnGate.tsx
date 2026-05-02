import React, { useState } from 'react';

export function WebAuthnGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleHardwareAuth = async () => {
    setLoading(true);
    // In a real implementation, this would use the WebAuthn API (navigator.credentials.get)
    // with a physical security key (Yubikey) challenge.
    console.log("Requesting Hardware Token Challenge...");
    
    setTimeout(() => {
      setLoading(false);
      onAuthenticated();
    }, 1500);
  };

  const containerStyle: React.CSSProperties = {
    height: '100vh',
    width: '100vw',
    background: '#020617',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#38bdf8',
    fontFamily: '"Inter", sans-serif'
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ letterSpacing: '4px', fontWeight: 700 }}>NEXUS SECURE ACCESS</h1>
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '30px' }}>
        Hardware-Bound Zero-Trust Protocol Active
      </p>
      
      <button
        onClick={handleHardwareAuth}
        disabled={loading}
        style={{
          padding: '15px 40px',
          background: 'transparent',
          border: '1px solid #38bdf8',
          color: '#38bdf8',
          borderRadius: '4px',
          cursor: 'pointer',
          textTransform: 'uppercase',
          fontSize: '12px',
          letterSpacing: '2px',
          transition: 'all 0.3s ease'
        }}
      >
        {loading ? "Authenticating via Security Key..." : "Insert Hardware Token"}
      </button>
      
      <div style={{ marginTop: '20px', fontSize: '10px', color: '#1e293b' }}>
        WebAuthn / FIDO2 / Biometric Only
      </div>
    </div>
  );
}
