import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Float, Sparkles, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

interface OrderBookCubeProps {
  position: [number, number, number];
  color: string;
  label: string;
  price: number;
}

const OrderBookCube = ({ position, color, label, price }: OrderBookCubeProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * (hovered ? 0.8 : 0.2);
      meshRef.current.rotation.y += delta * (hovered ? 1.5 : 0.5);
      
      // Gentle pulsing effect
      const scale = 1 + Math.sin(Date.now() / 500) * 0.05;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh
        position={position}
        ref={meshRef}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshPhysicalMaterial 
          color={hovered ? '#ffffff' : color} 
          transparent 
          opacity={0.85} 
          roughness={0.1}
          metalness={0.8}
          transmission={0.5}
          thickness={1.5}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.2}
        />
        <Text position={[0, 1.5, 0]} fontSize={0.3} color="white" font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff">
          {label}
        </Text>
        <Text position={[0, -1.5, 0]} fontSize={0.4} color={color} font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff">
          ${price.toFixed(2)}
        </Text>
      </mesh>
    </Float>
  );
};

export default function App() {
  const [signal, setSignal] = useState<any>(null);

  // Poll the signal engine for live mock data
  useEffect(() => {
    const fetchSignal = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8001/signal/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: 'NQZ6',
            price: 18500.50 + (Math.random() * 10 - 5),
            volume: 500,
            news_headline: 'Tech sector sees heavy volume'
          })
        });
        const data = await response.json();
        setSignal(data);
      } catch (err) {
        console.error("Signal API not available yet", err);
      }
    };
    
    fetchSignal();
    const interval = setInterval(fetchSignal, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* 3D Canvas Layer */}
      <Canvas camera={{ position: [0, 2, 7], fov: 50 }} style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={2} color="#00ffcc" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#ff00cc" />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={1} fade speed={1.5} />
        <Sparkles count={200} scale={10} size={2} speed={0.4} opacity={0.5} color="#00ffcc" />
        
        <OrderBookCube position={[-2.5, 0, 0]} color="#ff3366" label="SELL LIMIT" price={18505.25} />
        <OrderBookCube position={[2.5, 0, 0]} color="#00ffcc" label="BUY LIMIT" price={18498.50} />
        
        <ContactShadows position={[0, -2.5, 0]} opacity={0.5} scale={15} blur={2.5} far={4} color="#00ffcc" />
        <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 1.8} minDistance={4} maxDistance={12} />
      </Canvas>

      {/* Glassmorphic UI Layer */}
      <div style={{
        position: 'absolute', top: '30px', left: '30px', zIndex: 1,
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
        gap: '16px'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, letterSpacing: '2px', background: 'linear-gradient(90deg, #00ffcc, #0088ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          NEXUS
        </h1>
        <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#8892b0' }}>
          Spatial Intelligence Terminal
        </div>
        
        <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)' }} />

        {signal ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8892b0', fontSize: '14px' }}>Symbol</span>
              <span style={{ fontWeight: 600 }}>{signal.symbol}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8892b0', fontSize: '14px' }}>Sentiment</span>
              <span style={{ fontWeight: 600, color: signal.sentiment_score > 0 ? '#00ffcc' : '#ff3366' }}>
                {(signal.sentiment_score * 100).toFixed(1)}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8892b0', fontSize: '14px' }}>RL Strategy</span>
              <span style={{ fontWeight: 600, color: signal.rl_signal === 'BUY' ? '#00ffcc' : '#ff3366' }}>
                {signal.rl_signal} ({(signal.confidence * 100).toFixed(0)}%)
              </span>
            </div>
            <div style={{ marginTop: '8px', padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: '#8892b0', textTransform: 'uppercase', letterSpacing: '1px' }}>Action</span>
              <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px', color: signal.suggested_action === 'ENTER_LONG' ? '#00ffcc' : signal.suggested_action === 'ENTER_SHORT' ? '#ff3366' : '#ffd700' }}>
                {signal.suggested_action}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#8892b0', fontSize: '14px', fontStyle: 'italic' }}>Awaiting data stream...</div>
        )}
      </div>

      <div style={{
        position: 'absolute', bottom: '30px', right: '30px', zIndex: 1,
        color: 'rgba(255,255,255,0.3)', fontSize: '12px', letterSpacing: '1px'
      }}>
        LATENCY: &lt;1ms | NODE: USE-1A
      </div>
    </div>
  );
}
