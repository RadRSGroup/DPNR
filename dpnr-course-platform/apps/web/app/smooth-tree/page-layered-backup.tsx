'use client';

import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, ScrollControls, useScroll, Scroll, Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

// Separate tree into layers using alpha cutouts
function LayeredTree() {
  const groupRef = useRef<THREE.Group>(null);
  const scroll = useScroll();
  
  const treeTexture = useTexture('/tree-color.png');
  
  // Create multiple billboard layers at different depths
  const layers = [
    { z: 0, scale: 1, opacity: 1 },      // Main tree
    { z: -2, scale: 1.1, opacity: 0.3 }, // Background layer
    { z: 2, scale: 0.9, opacity: 0.5 },  // Foreground mist
  ];

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      // Parallax effect based on scroll
      groupRef.current.children.forEach((child, i) => {
        child.position.x = Math.sin(time * 0.1 + i) * 0.1;
        child.position.y = Math.sin(time * 0.15 + i) * 0.05;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {layers.map((layer, index) => (
        <sprite key={index} position={[0, 0, layer.z]} scale={[15 * layer.scale, 15 * layer.scale, 1]}>
          <spriteMaterial 
            map={treeTexture} 
            transparent 
            opacity={layer.opacity}
            depthWrite={index === 0}
          />
        </sprite>
      ))}
    </group>
  );
}

// Animated butterfly particles
function Butterflies({ count = 40 }) {
  const points = useRef<THREE.Points>(null);
  const scroll = useScroll();
  
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Position butterflies around the tree
      const angle = (i / count) * Math.PI * 2;
      const radius = 3 + Math.random() * 5;
      const height = -2 + Math.random() * 8;
      
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = height;
      pos[i * 3 + 2] = Math.sin(angle) * radius - 2;
      
      // Warm butterfly colors
      col[i * 3] = 1;
      col[i * 3 + 1] = 0.9 + Math.random() * 0.1;
      col[i * 3 + 2] = 0.7 + Math.random() * 0.3;
    }
    
    return [pos, col];
  }, [count]);

  useFrame((state) => {
    if (points.current) {
      const time = state.clock.getElapsedTime();
      const scrollOffset = scroll.offset;
      
      points.current.rotation.y = time * 0.05;
      
      // Update positions for butterfly movement
      const posArray = points.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const t = time + i * 0.5;
        
        // Figure-8 flight pattern
        posArray[i3] += Math.sin(t) * 0.02;
        posArray[i3 + 1] += Math.sin(t * 2) * 0.01;
        posArray[i3 + 2] += Math.cos(t) * 0.02;
      }
      points.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.2}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Volumetric fog effect
function VolumetricFog() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.01;
    }
  });

  return (
    <>
      <Sparkles
        count={200}
        scale={20}
        size={2}
        speed={0.2}
        opacity={0.3}
        color="#ffeeaa"
      />
      <fog attach="fog" args={['#e8f4e8', 10, 30]} />
    </>
  );
}

// Camera controller
function ScrollCamera() {
  const { camera } = useThree();
  const scroll = useScroll();
  
  const waypoints = [
    { pos: [0, 0, 15], target: [0, 0, 0] },    // Full view
    { pos: [5, -3, 8], target: [0, -2, 0] },   // Roots
    { pos: [-4, 0, 6], target: [0, 0, 0] },    // Trunk
    { pos: [3, 3, 7], target: [0, 2, 0] },     // Branches
    { pos: [0, 5, 10], target: [0, 3, 0] },    // Canopy
  ];
  
  useFrame(() => {
    const progress = Math.max(0, Math.min(1, scroll.offset)) * (waypoints.length - 1);
    const index = Math.floor(Math.max(0, Math.min(progress, waypoints.length - 1)));
    const nextIndex = Math.min(index + 1, waypoints.length - 1);
    const local = Math.max(0, Math.min(1, progress - index));
    
    const from = waypoints[index];
    const to = waypoints[nextIndex];
    
    // Safety check to ensure waypoints exist
    if (!from || !to || !from.pos || !to.pos) {
      return;
    }
    
    camera.position.lerpVectors(
      new THREE.Vector3(...from.pos),
      new THREE.Vector3(...to.pos),
      local
    );
    
    const target = new THREE.Vector3().lerpVectors(
      new THREE.Vector3(...from.target),
      new THREE.Vector3(...to.target),
      local
    );
    
    camera.lookAt(target);
  });
  
  return null;
}

export default function TreeScene() {
  return (
    <div className="w-full h-screen bg-gradient-to-b from-emerald-50 to-emerald-100">
      <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.7} color="#ffeedd" />
          <directionalLight position={[10, 10, 5]} intensity={0.5} color="#ffffff" />
          
          <ScrollControls pages={5} damping={0.1}>
            <ScrollCamera />
            
            <LayeredTree />
            <Butterflies count={30} />
            <VolumetricFog />
            
            <Scroll html>
              <div className="w-full h-[500vh]">
                {/* Your scroll content here */}
              </div>
            </Scroll>
          </ScrollControls>
        </Suspense>
      </Canvas>
    </div>
  );
}