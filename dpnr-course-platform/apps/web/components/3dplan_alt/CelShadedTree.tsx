import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import './CelShaderMaterials';

interface TreeProps {
  position?: [number, number, number];
  scale?: number;
  lightDirection?: THREE.Vector3;
}

export function CelShadedTree({ 
  position = [0, 0, 0], 
  scale = 1,
  lightDirection = new THREE.Vector3(1, 1, 0.5).normalize()
}: TreeProps) {
  const treeRef = useRef<THREE.Group>(null);
  const leavesRef = useRef<THREE.Mesh[]>([]);
  
  // Generate random leaf clusters
  const leafClusters = useMemo(() => {
    const clusters = [];
    const numClusters = 12;
    
    for (let i = 0; i < numClusters; i++) {
      const angle = (i / numClusters) * Math.PI * 2;
      const radius = 2 + Math.random() * 1.5;
      const height = 3 + Math.random() * 2;
      
      clusters.push({
        position: [
          Math.cos(angle) * radius * scale,
          height * scale,
          Math.sin(angle) * radius * scale
        ] as [number, number, number],
        scale: (0.8 + Math.random() * 0.4) * scale,
        rotation: [
          Math.random() * 0.5,
          Math.random() * Math.PI * 2,
          Math.random() * 0.5
        ] as [number, number, number],
      });
    }
    
    return clusters;
  }, [scale]);

  // Generate branch positions
  const branches = useMemo(() => {
    const branchData = [];
    const numBranches = 8;
    
    for (let i = 0; i < numBranches; i++) {
      const angle = (i / numBranches) * Math.PI * 2 + Math.random() * 0.5;
      const startHeight = 1.5 + Math.random() * 2;
      const length = 1.5 + Math.random();
      
      branchData.push({
        position: [
          Math.cos(angle) * 0.3 * scale,
          startHeight * scale,
          Math.sin(angle) * 0.3 * scale
        ] as [number, number, number],
        rotation: [
          Math.random() * 0.3 - 0.15,
          angle,
          Math.PI * 0.5 + Math.random() * 0.3 - 0.15
        ] as [number, number, number],
        scale: [length * scale, 0.15 * scale, 0.15 * scale] as [number, number, number],
      });
    }
    
    return branchData;
  }, [scale]);

  useFrame((state) => {
    // Gentle swaying animation
    if (treeRef.current) {
      const time = state.clock.elapsedTime;
      treeRef.current.rotation.z = Math.sin(time * 0.5) * 0.02;
      treeRef.current.rotation.x = Math.cos(time * 0.3) * 0.01;
    }
    
    // Individual leaf movement
    leavesRef.current.forEach((leaf, i) => {
      if (leaf) {
        const time = state.clock.elapsedTime + i * 0.5;
        leaf.rotation.y = Math.sin(time * 0.8) * 0.1;
        leaf.rotation.z = Math.cos(time * 0.6) * 0.05;
        leaf.position.y += Math.sin(time * 2 + i) * 0.002;
      }
    });
  });

  return (
    <group ref={treeRef} position={position}>
      {/* Main trunk */}
      <group>
        {/* Trunk outline */}
        <Cylinder args={[0.8 * scale, 1.2 * scale, 6 * scale, 12]}>
          <outlineMaterial color={[0.05, 0.05, 0.05]} thickness={0.008} />
        </Cylinder>
        
        {/* Trunk main */}
        <Cylinder args={[0.75 * scale, 1.15 * scale, 6 * scale, 12]}>
          <celTrunkMaterial 
            color={[0.4, 0.25, 0.15]}
            lightDirection={lightDirection}
            bands={3}
          />
        </Cylinder>
      </group>

      {/* Branches */}
      {branches.map((branch, i) => (
        <group key={`branch-${i}`}>
          {/* Branch outline */}
          <Cylinder 
            position={branch.position}
            rotation={branch.rotation}
            args={[branch.scale[1] + 0.02, branch.scale[1] + 0.02, branch.scale[0], 8]}
          >
            <outlineMaterial color={[0.05, 0.05, 0.05]} thickness={0.005} />
          </Cylinder>
          
          {/* Branch main */}
          <Cylinder 
            position={branch.position}
            rotation={branch.rotation}
            args={[branch.scale[1], branch.scale[1], branch.scale[0], 8]}
          >
            <celTrunkMaterial 
              color={[0.35, 0.22, 0.13]}
              lightDirection={lightDirection}
              bands={3}
            />
          </Cylinder>
        </group>
      ))}

      {/* Leaf clusters */}
      {leafClusters.map((cluster, i) => (
        <group key={`cluster-${i}`}>
          {/* Leaf outline */}
          <mesh
            ref={(el) => {
              if (el && leavesRef.current) leavesRef.current[i * 2] = el;
            }}
            position={cluster.position}
            rotation={cluster.rotation}
          >
            <sphereGeometry args={[cluster.scale + 0.1, 8, 6]} />
            <outlineMaterial color={[0.05, 0.1, 0.05]} thickness={0.008} />
          </mesh>
          
          {/* Leaf main */}
          <mesh
            ref={(el) => {
              if (el && leavesRef.current) leavesRef.current[i * 2 + 1] = el;
            }}
            position={cluster.position}
            rotation={cluster.rotation}
          >
            <sphereGeometry args={[cluster.scale, 8, 6]} />
            <celTreeMaterial 
              color={[0.3 + Math.random() * 0.1, 0.6 + Math.random() * 0.1, 0.2 + Math.random() * 0.05]}
              lightDirection={lightDirection}
              bands={4}
            />
          </mesh>
        </group>
      ))}

      {/* Root system hints */}
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const rootPos: [number, number, number] = [
          Math.cos(angle) * 1.5 * scale,
          -0.2 * scale,
          Math.sin(angle) * 1.5 * scale
        ];
        
        return (
          <group key={`root-${i}`}>
            {/* Root outline */}
            <Sphere position={rootPos} args={[0.4 * scale + 0.02, 8, 6]}>
              <outlineMaterial color={[0.05, 0.05, 0.05]} thickness={0.005} />
            </Sphere>
            
            {/* Root main */}
            <Sphere position={rootPos} args={[0.4 * scale, 8, 6]}>
              <celTrunkMaterial 
                color={[0.3, 0.2, 0.12]}
                lightDirection={lightDirection}
                bands={2}
              />
            </Sphere>
          </group>
        );
      })}
    </group>
  );
}