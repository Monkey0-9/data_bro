import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Sparkles, ContactShadows } from '@react-three/drei';
import { OrderBookCube } from './OrderBookCube';
import { TDAStressMap } from './TDAStressMap';
import { ProbabilisticShadow } from './ProbabilisticShadow';

export function SceneCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 2, 7], fov: 50 }}
      gl={{ 
        antialias: true, 
        powerPreference: 'high-performance',
      }}
      style={{ position: 'absolute', top: 0, left: 0, zIndex: 0, width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={2} color="#00ffcc" />
      <pointLight position={[-10, -10, -10]} intensity={1} color="#ff00cc" />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={1} fade speed={1.5} />
      <Sparkles count={200} scale={10} size={2} speed={0.4} opacity={0.5} color="#00ffcc" />

      <OrderBookCube position={[-2.5, 0, 0]} color="#ff3366" label="SELL LIMIT" price={18505.25} />
      <OrderBookCube position={[2.5, 0, 0]} color="#00ffcc" label="BUY LIMIT" price={18498.50} />

      {/* TDA Stress Map visualization */}
      <TDAStressMap position={[0, -1, -5]} />

      {/* Probabilistic Price Shadows */}
      <ProbabilisticShadow position={[2, 0.5, 2]} />
      <ProbabilisticShadow position={[2, 0.2, 2.5]} />

      <ContactShadows position={[0, -2.5, 0]} opacity={0.5} scale={15} blur={2.5} far={4} color="#00ffcc" />
      <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 1.8} minDistance={4} maxDistance={12} />
    </Canvas>
  );
}
