import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function ProbabilisticShadow({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create a "Ghost Shadow" geometry that widens over time to show uncertainty
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 50; i++) {
      // Uncertainty cone: x increases, y/z spread increases
      // Uncertainty cone: x increases, y/z spread increases
      pts.push(new THREE.Vector3(i * 0.1, Math.sin(i * 0.5) * 0.2, 0));
    }
    return pts;
  }, []);

  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, 64, 0.05, 8, false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={position} geometry={geometry}>
      <meshStandardMaterial 
        color="#00ffcc" 
        transparent={true} 
        opacity={0.2} 
        emissive="#00ffcc"
        emissiveIntensity={1}
      />
    </mesh>
  );
}
