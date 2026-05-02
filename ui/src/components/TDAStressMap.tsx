import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function TDAStressMap({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create a displacement map for the "Topological Map" effect
  const planeSize = 10;
  const planeRes = 64;
  
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(planeSize, planeSize, planeRes, planeRes);
    // Initial deformation to create "Mountains" and "Rifts"
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Simulating high-correlation clusters as mountains
      const z = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 1.5;
      pos.setZ(i, z);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      const pos = meshRef.current.geometry.attributes.position;
      
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        // Animate the map based on "Market Stress"
        const stress = Math.sin(x * 0.3 + time) * Math.cos(y * 0.3 + time * 0.5) * 0.5;
        pos.setZ(i, stress + (Math.sin(x * 0.5) * Math.cos(y * 0.5) * 1.5));
      }
      pos.needsUpdate = true;
      meshRef.current.geometry.computeVertexNormals();
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={[-Math.PI / 2.5, 0, 0]} geometry={geometry}>
      <meshStandardMaterial 
        color="#38bdf8" 
        wireframe={true} 
        transparent={true} 
        opacity={0.3}
        emissive="#0ea5e9"
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}
