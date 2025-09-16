'use client';

import React, { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';

interface TreeSpriteProps {
  position?: [number, number, number];
  scale?: number;
}

export function TreeSprite({ 
  position = [0, 0, 0], 
  scale = 1 
}: TreeSpriteProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Load the actual tree photo
  const texture = useLoader(TextureLoader, '/Treephoto.jpeg');
  
  // Configure texture for better quality
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  // Gentle floating animation
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      meshRef.current.position.y = position[1] + Math.sin(time * 0.6) * 0.05;
      
      // Subtle scale breathing effect
      const breathe = 1 + Math.sin(time * 0.4) * 0.02;
      meshRef.current.scale.setScalar(scale * breathe);
    }
  });

  return (
    <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
      <mesh
        ref={meshRef}
        position={position}
      >
        {/* Square plane for the image */}
        <planeGeometry args={[8 * scale, 8 * scale]} />
        <meshBasicMaterial 
          map={texture}
          transparent={true}
          alphaTest={0.01}
          side={THREE.DoubleSide}
        />
      </mesh>
    </Billboard>
  );
}