import { useState } from 'react';
import { useWebSocketSignal } from './hooks/useWebSocketSignal';
import { SceneCanvas } from './components/SceneCanvas';
import { SignalPanel } from './components/SignalPanel';
import { InsightEngine } from './components/InsightEngine';
import { PlatformPlumbing } from './components/PlatformPlumbing';
import { AuthFlow } from './components/AuthFlow';
import { WebAuthnGate } from './components/WebAuthnGate';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function ProtectedApp() {
  const { isAuthenticated, login } = useAuth();
  const [hardwareAuthPassed, setHardwareAuthPassed] = useState(false);
  useWebSocketSignal();

  if (!isAuthenticated) {
    return <AuthFlow onLogin={login} />;
  }

  if (!hardwareAuthPassed) {
    return <WebAuthnGate onAuthenticated={() => setHardwareAuthPassed(true)} />;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <SceneCanvas />
      <SignalPanel />
      <InsightEngine />
      <PlatformPlumbing />
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
