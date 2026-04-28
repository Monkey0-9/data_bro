import { useWebSocketSignal } from './hooks/useWebSocketSignal';
import { SceneCanvas } from './components/SceneCanvas';
import { SignalPanel } from './components/SignalPanel';

export default function App() {
  useWebSocketSignal();

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <SceneCanvas />
      <SignalPanel />
    </div>
  );
}
