import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, Point } from '@react-three/drei';
import * as THREE from 'three';
import './CelShaderMaterials';

interface ButterflyData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  phase: number;
  scale: number;
  color: THREE.Color;
  wingBeat: number;
}

interface ButterflyParticlesProps {
  count?: number;
  bounds?: number;
  colors?: THREE.Color[];
}

export function ButterflyParticles({ 
  count = 15, 
  bounds = 8,
  colors = [
    new THREE.Color(1.0, 0.6, 0.2),
    new THREE.Color(0.8, 0.2, 0.8),
    new THREE.Color(0.2, 0.8, 0.6),
    new THREE.Color(1.0, 0.8, 0.3),
    new THREE.Color(0.6, 0.3, 0.9),
  ]
}: ButterflyParticlesProps) {
  const butterfliesRef = useRef<THREE.Group>(null);
  
  // Individual butterfly meshes
  const butterflyMeshes = useRef<THREE.Mesh[]>([]);
  
  // Initialize butterfly data
  const butterflies = useMemo<ButterflyData[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * bounds,
        Math.random() * 6 + 1,
        (Math.random() - 0.5) * bounds
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.5
      ),
      phase: Math.random() * Math.PI * 2,
      scale: 0.15 + Math.random() * 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
      wingBeat: 8 + Math.random() * 4,
    }));
  }, [count, bounds, colors]);

  // Create butterfly geometry (simple wing shape)
  const butterflyGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    
    // Wing vertices (simple butterfly wing shape)
    const vertices = new Float32Array([
      // Left wing
      -0.5, 0, 0,
      -1.5, 0.5, 0,
      -1.2, 1.2, 0,
      -0.3, 0.8, 0,
      
      // Right wing
      0.5, 0, 0,
      1.5, 0.5, 0,
      1.2, 1.2, 0,
      0.3, 0.8, 0,
      
      // Body
      0, -0.2, 0,
      0, 1.0, 0,
    ]);
    
    const indices = new Uint16Array([
      // Left wing triangles
      0, 1, 3,
      1, 2, 3,
      
      // Right wing triangles
      4, 7, 5,
      5, 7, 6,
      
      // Body
      8, 9, 0,
      8, 0, 4,
    ]);
    
    const uvs = new Float32Array([
      // Left wing UVs
      0, 0,
      0, 1,
      0.5, 1,
      0.5, 0,
      
      // Right wing UVs
      0.5, 0,
      1, 1,
      1, 1,
      1, 0,
      
      // Body UVs
      0.5, 0,
      0.5, 1,
    ]);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    
    return geometry;
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    butterflyMeshes.current.forEach((mesh, i) => {
      if (!mesh || !butterflies[i]) return;
      
      const butterfly = butterflies[i];
      
      // Update position with flowing movement
      const flowX = Math.sin(time * 0.5 + butterfly.phase) * 0.8;
      const flowY = Math.cos(time * 0.3 + butterfly.phase) * 0.5;
      const flowZ = Math.sin(time * 0.4 + butterfly.phase + 1) * 0.8;
      
      butterfly.velocity.x += (flowX - butterfly.velocity.x) * 0.02;
      butterfly.velocity.y += (flowY - butterfly.velocity.y) * 0.01;
      butterfly.velocity.z += (flowZ - butterfly.velocity.z) * 0.02;
      
      butterfly.position.add(butterfly.velocity.clone().multiplyScalar(0.05));
      
      // Keep within bounds
      if (Math.abs(butterfly.position.x) > bounds) {
        butterfly.velocity.x *= -0.5;
        butterfly.position.x = Math.sign(butterfly.position.x) * bounds;
      }
      if (butterfly.position.y > 8 || butterfly.position.y < 0.5) {
        butterfly.velocity.y *= -0.5;
        butterfly.position.y = Math.max(0.5, Math.min(8, butterfly.position.y));
      }
      if (Math.abs(butterfly.position.z) > bounds) {
        butterfly.velocity.z *= -0.5;
        butterfly.position.z = Math.sign(butterfly.position.z) * bounds;
      }
      
      // Update mesh position
      mesh.position.copy(butterfly.position);
      
      // Wing beating rotation
      const wingBeat = Math.sin(time * butterfly.wingBeat + butterfly.phase);
      mesh.rotation.z = wingBeat * 0.3;
      mesh.rotation.x = Math.sin(time * 2 + butterfly.phase) * 0.1;
      
      // Face movement direction
      const direction = butterfly.velocity.clone().normalize();
      mesh.lookAt(butterfly.position.clone().add(direction));
      
      // Update material uniforms
      if (mesh.material && 'uniforms' in mesh.material) {
        const material = mesh.material as THREE.ShaderMaterial;
        if (material.uniforms) {
          material.uniforms.time.value = time;
          material.uniforms.color1.value = butterfly.color;
          material.uniforms.color2.value = butterfly.color.clone().multiplyScalar(0.7);
        }
      }
    });
  });

  return (
    <group ref={butterfliesRef}>
      {butterflies.map((butterfly, i) => (
        <group key={`butterfly-${i}`}>
          {/* Butterfly outline */}
          <mesh
            geometry={butterflyGeometry}
            position={butterfly.position.toArray()}
            scale={[butterfly.scale + 0.02, butterfly.scale + 0.02, butterfly.scale + 0.02]}
          >
            <outlineMaterial color={[0.1, 0.1, 0.1]} thickness={0.002} />
          </mesh>
          
          {/* Butterfly main */}
          <mesh
            ref={(el) => {
              if (el) butterflyMeshes.current[i] = el;
            }}
            geometry={butterflyGeometry}
            position={butterfly.position.toArray()}
            scale={[butterfly.scale, butterfly.scale, butterfly.scale]}
          >
            <celButterflyMaterial
              time={0}
              color1={butterfly.color}
              color2={butterfly.color.clone().multiplyScalar(0.7)}
              lightDirection={new THREE.Vector3(1, 1, 0.5).normalize()}
              bands={3}
            />
          </mesh>
        </group>
      ))}
      
      {/* Additional particle sparkles around butterflies */}
      <Points limit={count * 3}>
        {butterflies.map((butterfly, i) => (
          <React.Fragment key={`sparkle-${i}`}>
            <Point 
              position={[
                butterfly.position.x + (Math.random() - 0.5) * 0.5,
                butterfly.position.y + (Math.random() - 0.5) * 0.5,
                butterfly.position.z + (Math.random() - 0.5) * 0.5,
              ]}
              color={butterfly.color}
              size={2}
            />
          </React.Fragment>
        ))}
        <pointsMaterial
          transparent
          opacity={0.6}
          size={0.05}
          sizeAttenuation
          vertexColors
        />
      </Points>
    </group>
  );
}