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
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Topological Data Analysis: Geometric representation of 500+ asset correlations
      // High-correlation clusters form mountains; Decoupling assets form rifts
      const z = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 1.5;
      pos.setZ(i, z);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const fragilityColor = useMemo(() => new THREE.Color("#0ea5e9"), []);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      const pos = meshRef.current.geometry.attributes.position;
      
      let maxStress = 0;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        
        // Detect "Shape Collapse" - rapid change in topological geometry
        const stress = Math.sin(x * 0.3 + time) * Math.cos(y * 0.3 + time * 0.5) * 0.5;
        const finalZ = stress + (Math.sin(x * 0.5) * Math.cos(y * 0.5) * 1.5);
        pos.setZ(i, finalZ);
        
        if (Math.abs(stress) > maxStress) maxStress = Math.abs(stress);
      }
      
      // Visual indicator of Market Fragility (Geometric Decoupling)
      if (maxStress > 0.45) {
        fragilityColor.set("#f43f5e"); // Warning: Shape Collapse imminent
      } else {
        fragilityColor.set("#0ea5e9");
      }
      
      pos.needsUpdate = true;
      meshRef.current.geometry.computeVertexNormals();
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={[-Math.PI / 2.5, 0, 0]} geometry={geometry}>
      <meshStandardMaterial 
        color={fragilityColor} 
        wireframe={true} 
        transparent={true} 
        opacity={0.4}
        emissive={fragilityColor}
        emissiveIntensity={0.8}
      />
    </mesh>
  );
}
