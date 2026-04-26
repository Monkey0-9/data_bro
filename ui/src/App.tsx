import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';

interface OrderBookCubeProps {
  position: [number, number, number];
  color: string;
  label: string;
}

const OrderBookCube = ({ position, color, label }: OrderBookCubeProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.2;
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <mesh
      position={position}
      ref={meshRef}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : color} transparent opacity={0.8} />
      <Text position={[0, 1.2, 0]} fontSize={0.5} color="white">
        {label}
      </Text>
    </mesh>
  );
};

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: 'black' }}>
      <Canvas camera={{ position: [0, 2, 5], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {/* Mock Order Book Visualizations */}
        <OrderBookCube position={[-2, 0, 0]} color="red" label="SELL (ESM6)" />
        <OrderBookCube position={[2, 0, 0]} color="green" label="BUY (ESM6)" />
        
        <OrbitControls />
      </Canvas>
      <div style={{ position: 'absolute', top: '20px', left: '20px', color: '#00ffcc', fontFamily: 'monospace', textShadow: '0 0 5px #00ffcc' }}>
        <h1>NEXUS Spatial Terminal</h1>
        <p>Real-time 3D Order Book Visualization</p>
      </div>
    </div>
  );
}
