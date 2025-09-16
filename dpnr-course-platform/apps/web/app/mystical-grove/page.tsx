'use client';

import React, { useRef, useState, Suspense, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ScrollControls, Scroll, Html, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';

// Define the custom shader for the butterflies.
const ButterflyMaterial = shaderMaterial(
  {
    u_time: 0,
    u_color: new THREE.Color(0xffffff),
  },
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  `
    uniform float u_time;
    uniform vec3 u_color;
    varying vec2 vUv;

    void main() {
      vec3 color = u_color;
      float alpha = 1.0;

      // Add a subtle flicker effect based on time
      float flicker = 0.5 + 0.5 * sin(u_time * 10.0 + vUv.x * 5.0);
      color *= flicker;

      gl_FragColor = vec4(color, alpha);
    }
  `
);

// Extend so we can use it in JSX
extend({ ButterflyMaterial });

function Butterflies({ count = 200 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<any>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Use a custom geometry for the butterfly shape
  const butterflyGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      // A simple diamond-like shape
      0, 0.5, 0,
      -0.2, 0, 0,
      0, -0.5, 0,
      0.2, 0, 0,
    ]);
    const uvs = new Float32Array([
      0.5, 1,
      0, 0.5,
      0.5, 0,
      1, 0.5,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]); // Two triangles for a diamond
    return geo;
  }, []);

  const positions = useMemo(() => {
    const tempPositions = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 20;
      tempPositions.push(new THREE.Vector3(x, y, z));
    }
    return tempPositions;
  }, [count]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Update shader time uniform
    if (materialRef.current) {
      materialRef.current.u_time = time;
    }
    
    if (meshRef.current) {
      for (let i = 0; i < count; i++) {
        const { x, y, z } = positions[i];
        // Animate the butterflies with a sine wave for a floating effect
        dummy.position.set(
          x + Math.sin(time + i * 0.1) * 0.5,
          y + Math.cos(time + i * 0.15) * 0.5,
          z + Math.sin(time + i * 0.2) * 0.5
        );
        // Make them face the camera
        dummy.lookAt(state.camera.position);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[butterflyGeometry, undefined, count]}>
      {/* @ts-ignore */}
      <butterflyMaterial
        ref={materialRef}
        attach="material"
        u_color={new THREE.Color('#ffeeaa')}
        transparent
      />
    </instancedMesh>
  );
}

function Tree({ menuFocus, setMenuFocus }: { menuFocus: string | null, setMenuFocus: (focus: string | null) => void }) {
  const treeRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Handle camera movement to focus on menu items
  useEffect(() => {
    if (menuFocus) {
      const targetPosition = new THREE.Vector3();
      const targetLookAt = new THREE.Vector3();

      switch (menuFocus) {
        case 'root':
          targetPosition.set(0, 0, 5);
          targetLookAt.set(0, -1, 0);
          break;
        case 'trunk':
          targetPosition.set(0, 3, 5);
          targetLookAt.set(0, 3, 0);
          break;
        case 'canopy':
          targetPosition.set(0, 10, 5);
          targetLookAt.set(0, 10, 0);
          break;
        default:
          targetPosition.set(0, 5, 20); // Reset to default
          targetLookAt.set(0, 5, 0);
          break;
      }

      // Smoothly move the camera to the target position
      const initialPosition = camera.position.clone();
      const duration = 2000;
      const startTime = performance.now();

      const animateCamera = () => {
        const elapsedTime = performance.now() - startTime;
        const t = Math.min(elapsedTime / duration, 1);
        const easeT = 3 * t * t - 2 * t * t * t;

        camera.position.lerpVectors(initialPosition, targetPosition, easeT);
        camera.lookAt(targetLookAt.clone().lerp(targetLookAt, easeT));
        
        if (t < 1) {
          requestAnimationFrame(animateCamera);
        } else {
          setMenuFocus(null); // Clear focus after animation
        }
      };
      animateCamera();
    }
  }, [menuFocus, camera, setMenuFocus]);

  // Use a group to hold the tree parts
  return (
    <group ref={treeRef} position={[0, -5, 0]}>
      {/* Placeholder Trunk (Cylinder) */}
      <mesh position={[0, 4.5, 0]}>
        <cylinderGeometry args={[2, 3, 9, 32]} />
        <meshStandardMaterial color="#5c3817" roughness={0.7} metalness={0.1} />
      </mesh>
      
      {/* Placeholder Canopy (Sphere) */}
      <mesh position={[0, 11, 0]}>
        <icosahedronGeometry args={[5, 1]} />
        <meshStandardMaterial color="#4d743a" roughness={0.8} metalness={0.0} />
      </mesh>
    </group>
  );
}

function Rig({ children }: { children: React.ReactNode }) {
  const { camera, mouse } = useThree();
  const vec = new THREE.Vector3();

  // Make the camera follow the mouse slightly for a parallax effect
  useFrame(() => {
    camera.position.lerp(vec.set(mouse.x * 2, mouse.y * 1, camera.position.z), 0.05);
    camera.lookAt(0, 0, 0);
  });
  
  return <>{children}</>;
}

export default function MysticalGrove() {
  const [menuFocus, setMenuFocus] = useState<string | null>(null);

  return (
    <div className="bg-gray-900 w-screen h-screen">
      <Canvas
        camera={{ position: [0, 5, 20], fov: 75 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -10]} intensity={1} />

          <ScrollControls pages={4} damping={0.25}>
            <Scroll html>
              <div className="absolute top-0 left-0 right-0 p-8 flex justify-center">
                <div className="bg-white/20 backdrop-blur-lg p-4 rounded-3xl shadow-lg border border-white/30 text-white">
                  <h1 className="text-xl font-bold mb-2">The Mystical Grove</h1>
                  <p className="text-sm text-center">Scroll to explore!</p>
                </div>
              </div>
              <div className="w-screen h-[400vh]"></div>
            </Scroll>
            
            <Tree menuFocus={menuFocus} setMenuFocus={setMenuFocus} />
            <Butterflies count={200} />
            <Rig>
              <></>
            </Rig>
          </ScrollControls>
        </Suspense>
      </Canvas>
      
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 p-4">
        <div className="flex gap-4 bg-white/20 backdrop-blur-lg p-4 rounded-3xl shadow-lg border border-white/30 text-white">
          <button
            onClick={() => setMenuFocus('root')}
            className="px-6 py-3 rounded-full bg-indigo-500 hover:bg-indigo-600 transition-colors duration-300 font-bold text-sm shadow-md"
          >
            The Roots
          </button>
          <button
            onClick={() => setMenuFocus('trunk')}
            className="px-6 py-3 rounded-full bg-indigo-500 hover:bg-indigo-600 transition-colors duration-300 font-bold text-sm shadow-md"
          >
            The Trunk
          </button>
          <button
            onClick={() => setMenuFocus('canopy')}
            className="px-6 py-3 rounded-full bg-indigo-500 hover:bg-indigo-600 transition-colors duration-300 font-bold text-sm shadow-md"
          >
            The Canopy
          </button>
        </div>
      </div>
    </div>
  );
}

// Remove the createRoot code - Next.js handles this automatically