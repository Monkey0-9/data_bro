import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Text } from '@react-three/drei';
import * as THREE from 'three';

interface OrderBookCubeProps {
  position: [number, number, number];
  color: string;
  label: string;
  price: number;
}

export function OrderBookCube({ position, color, label, price }: OrderBookCubeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * (hovered ? 0.8 : 0.2);
      meshRef.current.rotation.y += delta * (hovered ? 1.5 : 0.5);
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
        <Text position={[0, 1.5, 0]} fontSize={0.3} color="white">
          {label}
        </Text>
        <Text position={[0, -1.5, 0]} fontSize={0.4} color={color}>
          ${price.toFixed(2)}
        </Text>
      </mesh>
    </Float>
  );
}
