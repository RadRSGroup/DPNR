'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SimpleTreeProps {
  position?: [number, number, number];
  scale?: number;
}

// Fixed cel-shader material without conflicts
const celShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Color(0.3, 0.6, 0.2) },
    uLightDirection: { value: new THREE.Vector3(1, 1, 0.5).normalize() },
    uBands: { value: 4.0 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform vec3 uLightDirection;
    uniform float uBands;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      float intensity = dot(vNormal, uLightDirection);
      intensity = max(0.0, intensity);
      
      // Quantize lighting into bands for cel-shading
      float quantized = floor(intensity * uBands) / uBands;
      quantized = max(0.3, quantized); // Minimum ambient lighting
      
      // Add subtle color variation
      float variation = sin(vPosition.x * 0.5) * sin(vPosition.z * 0.5) * 0.08;
      
      vec3 finalColor = uColor * (quantized + variation);
      
      // Slight color variation for organic look
      finalColor.g += sin(vPosition.y * 0.3) * 0.05;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
});

// Trunk material
const trunkShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Color(0.4, 0.25, 0.15) },
    uLightDirection: { value: new THREE.Vector3(1, 1, 0.5).normalize() },
    uBands: { value: 3.0 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform vec3 uLightDirection;
    uniform float uBands;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      float intensity = dot(vNormal, uLightDirection);
      intensity = max(0.0, intensity);
      
      // Quantize lighting for cel-shading
      float quantized = floor(intensity * uBands) / uBands;
      quantized = max(0.2, quantized);
      
      // Bark texture variation
      float bark = sin(vPosition.y * 8.0) * sin(vPosition.x * 6.0) * 0.1;
      
      vec3 finalColor = uColor * quantized;
      finalColor += bark * vec3(0.1, 0.05, 0.02);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
});

export function SimpleCelTree({ 
  position = [0, 0, 0], 
  scale = 1 
}: SimpleTreeProps) {
  const treeRef = useRef<THREE.Group>(null);
  const leavesRefs = useRef<THREE.Mesh[]>([]);
  
  // Generate leaf clusters - inspired by the treephoto.jpeg
  const leafClusters = useMemo(() => {
    const clusters = [];
    const numClusters = 15; // More clusters for fuller canopy
    
    for (let i = 0; i < numClusters; i++) {
      const angle = (i / numClusters) * Math.PI * 2 + Math.random() * 0.3;
      const radius = 1.8 + Math.random() * 1.2; // Wider spread
      const height = 2.5 + Math.random() * 1.5;
      
      clusters.push({
        position: [
          Math.cos(angle) * radius * scale,
          height * scale,
          Math.sin(angle) * radius * scale
        ] as [number, number, number],
        scale: (0.6 + Math.random() * 0.5) * scale,
        color: new THREE.Color(
          0.25 + Math.random() * 0.15, // Green variation
          0.5 + Math.random() * 0.2,   // More green
          0.15 + Math.random() * 0.1   // Less blue
        )
      });
    }
    
    return clusters;
  }, [scale]);

  // Generate main branches
  const branches = useMemo(() => {
    const branchData = [];
    const numBranches = 6; // Main structural branches
    
    for (let i = 0; i < numBranches; i++) {
      const angle = (i / numBranches) * Math.PI * 2;
      const startHeight = 1.2 + Math.random() * 1.5;
      const length = 1.2 + Math.random() * 0.8;
      
      branchData.push({
        position: [
          Math.cos(angle) * 0.4 * scale,
          startHeight * scale,
          Math.sin(angle) * 0.4 * scale
        ] as [number, number, number],
        rotation: [
          Math.random() * 0.2 - 0.1,
          angle,
          Math.PI * 0.4 + Math.random() * 0.2
        ] as [number, number, number],
        scale: [length * scale, 0.12 * scale, 0.12 * scale] as [number, number, number],
      });
    }
    
    return branchData;
  }, [scale]);

  // Gentle animation
  useFrame((state) => {
    if (treeRef.current) {
      const time = state.clock.elapsedTime;
      // Very subtle swaying
      treeRef.current.rotation.z = Math.sin(time * 0.4) * 0.015;
      treeRef.current.rotation.x = Math.cos(time * 0.25) * 0.008;
    }
    
    // Gentle leaf movement
    leavesRefs.current.forEach((leaf, i) => {
      if (leaf) {
        const time = state.clock.elapsedTime + i * 0.3;
        leaf.rotation.y = Math.sin(time * 0.6) * 0.08;
        leaf.position.y += Math.sin(time * 1.5 + i) * 0.001;
      }
    });
  });

  return (
    <group ref={treeRef} position={position}>
      {/* Main trunk - wider base like the reference */}
      <mesh>
        <cylinderGeometry args={[0.6 * scale, 0.9 * scale, 5 * scale, 12]} />
        <primitive object={trunkShaderMaterial} attach="material" />
      </mesh>

      {/* Major branches */}
      {branches.map((branch, i) => (
        <mesh 
          key={`branch-${i}`}
          position={branch.position}
          rotation={branch.rotation}
        >
          <cylinderGeometry args={[branch.scale[1], branch.scale[1], branch.scale[0], 8]} />
          <primitive object={trunkShaderMaterial} attach="material" />
        </mesh>
      ))}

      {/* Leaf clusters - full canopy */}
      {leafClusters.map((cluster, i) => (
        <mesh
          key={`leaves-${i}`}
          ref={(el) => {
            if (el) leavesRefs.current[i] = el;
          }}
          position={cluster.position}
        >
          <sphereGeometry args={[cluster.scale, 8, 6]} />
          <meshLambertMaterial color={cluster.color} />
        </mesh>
      ))}

      {/* Root system suggestions */}
      {[...Array(4)].map((_, i) => {
        const angle = (i / 4) * Math.PI * 2;
        const rootPos: [number, number, number] = [
          Math.cos(angle) * 1.2 * scale,
          -0.3 * scale,
          Math.sin(angle) * 1.2 * scale
        ];
        
        return (
          <mesh key={`root-${i}`} position={rootPos}>
            <sphereGeometry args={[0.3 * scale, 6, 4]} />
            <primitive object={trunkShaderMaterial} attach="material" />
          </mesh>
        );
      })}
    </group>
  );
}