'use client';

import React, { useRef, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

interface ImageTreeProps {
  position?: [number, number, number];
  scale?: number;
}

export function ImageBasedTree({ 
  position = [0, 0, 0], 
  scale = 1 
}: ImageTreeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Load the actual tree photo
  const texture = useLoader(TextureLoader, '/Treephoto.jpeg');
  
  // Configure texture
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  // Gentle floating animation
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      meshRef.current.position.y = position[1] + Math.sin(time * 0.5) * 0.1;
      meshRef.current.rotation.y = Math.sin(time * 0.3) * 0.02; // Subtle sway
      
      // Scale effect on hover
      const targetScale = hovered ? scale * 1.05 : scale;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[position[0], position[1], position[2]]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Plane geometry to display the image */}
      <planeGeometry args={[6 * scale, 6 * scale]} />
      <meshBasicMaterial 
        map={texture}
        transparent={true}
        alphaTest={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}