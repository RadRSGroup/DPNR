'use client';

import React, { useRef, useState, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { ScrollControls, Scroll, Html, Billboard, shaderMaterial } from '@react-three/drei';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';

// Beautiful butterfly shader with glow effect
const ButterflyMaterial = shaderMaterial(
  {
    u_time: 0,
    u_color: new THREE.Color(0xffffff),
    u_opacity: 1.0,
  },
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  `
    uniform float u_time;
    uniform vec3 u_color;
    uniform float u_opacity;
    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      // Create wing pattern
      float wing = abs(vUv.x - 0.5) * 2.0;
      float spots = sin(vUv.x * 15.0) * sin(vUv.y * 8.0) * 0.3 + 0.7;
      
      // Iridescent color shift
      float shimmer = sin(u_time * 3.0 + vUv.x * 10.0) * 0.3 + 0.7;
      vec3 color = u_color * spots * shimmer;
      
      // Wing transparency
      float alpha = (1.0 - wing * 0.7) * u_opacity;
      
      gl_FragColor = vec4(color, alpha);
    }
  `
);

extend({ ButterflyMaterial });

function MagicalButterflies({ count = 50 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<any>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Wing-shaped geometry
  const butterflyGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      // Left wing
      -0.3, 0.2, 0,   -0.1, 0.05, 0,   -0.3, -0.1, 0,
      // Right wing  
      0.3, 0.2, 0,    0.1, 0.05, 0,    0.3, -0.1, 0,
    ]);
    const uvs = new Float32Array([
      0, 1, 0.5, 0.5, 0, 0,
      1, 1, 0.5, 0.5, 1, 0,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex([0, 1, 2, 3, 4, 5]);
    return geo;
  }, []);

  const butterflies = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          Math.random() * 8 - 2,
          (Math.random() - 0.5) * 15
        ),
        speed: 0.5 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        color: new THREE.Color().setHSL(0.1 + Math.random() * 0.8, 0.7, 0.6),
      });
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (materialRef.current) {
      materialRef.current.u_time = time;
    }
    
    if (meshRef.current) {
      butterflies.forEach((butterfly, i) => {
        const { position, speed, phase } = butterfly;
        
        // Flowing butterfly movement
        dummy.position.set(
          position.x + Math.sin(time * speed + phase) * 2,
          position.y + Math.sin(time * speed * 0.7 + phase) * 1.5,
          position.z + Math.cos(time * speed + phase) * 2
        );
        
        // Flutter rotation
        dummy.rotation.z = Math.sin(time * 8 + phase) * 0.3;
        dummy.rotation.y = time * 0.5 + phase;
        
        // Wing flapping scale
        const flap = 0.8 + Math.sin(time * 12 + phase) * 0.2;
        dummy.scale.set(flap, 1, 1);
        
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[butterflyGeometry, undefined, count]}>
      {/* @ts-ignore */}
      <butterflyMaterial
        ref={materialRef}
        attach="material"
        u_color={new THREE.Color('#ffcc88')}
        u_opacity={0.8}
        transparent
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

function BeautifulTree({ menuFocus, setMenuFocus }: { menuFocus: string | null, setMenuFocus: (focus: string | null) => void }) {
  const treeRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  
  // Load the beautiful tree image
  const texture = useLoader(TextureLoader, '/Treephoto.jpeg');
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // Camera animation for menu focus
  React.useEffect(() => {
    if (menuFocus) {
      const targetPos = new THREE.Vector3();
      
      switch (menuFocus) {
        case 'root':
          targetPos.set(0, -2, 8);
          break;
        case 'trunk':
          targetPos.set(0, 2, 8);
          break;
        case 'canopy':
          targetPos.set(0, 8, 8);
          break;
        default:
          targetPos.set(0, 3, 12);
          break;
      }

      const start = camera.position.clone();
      const startTime = performance.now();
      const duration = 1500;

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = t * t * (3 - 2 * t); // Smooth ease
        
        camera.position.lerpVectors(start, targetPos, eased);
        camera.lookAt(0, 2, 0);
        
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          setMenuFocus(null);
        }
      };
      animate();
    }
  }, [menuFocus, camera, setMenuFocus]);

  // Gentle breathing animation
  useFrame((state) => {
    if (treeRef.current) {
      const time = state.clock.getElapsedTime();
      const breathe = 1 + Math.sin(time * 0.8) * 0.03;
      treeRef.current.scale.setScalar(breathe);
      treeRef.current.position.y = Math.sin(time * 0.6) * 0.1;
    }
  });

  return (
    <group ref={treeRef} position={[0, 0, 0]}>
      <Billboard follow={true}>
        <mesh>
          <planeGeometry args={[10, 10]} />
          <meshBasicMaterial 
            map={texture}
            transparent={true}
            alphaTest={0.01}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Billboard>
      
      {/* Additional atmosphere trees in background */}
      <Billboard follow={true}>
        <mesh position={[-8, -1, -5]} scale={0.6}>
          <planeGeometry args={[10, 10]} />
          <meshBasicMaterial 
            map={texture}
            transparent={true}
            alphaTest={0.01}
            opacity={0.4}
          />
        </mesh>
      </Billboard>
      
      <Billboard follow={true}>
        <mesh position={[6, -0.5, -7]} scale={0.8}>
          <planeGeometry args={[10, 10]} />
          <meshBasicMaterial 
            map={texture}
            transparent={true}
            alphaTest={0.01}
            opacity={0.3}
          />
        </mesh>
      </Billboard>
    </group>
  );
}

function CameraRig({ children }: { children: React.ReactNode }) {
  const { camera, mouse } = useThree();
  
  useFrame(() => {
    // Gentle mouse parallax
    camera.position.x += (mouse.x * 0.5 - camera.position.x) * 0.02;
    camera.position.y += (mouse.y * 0.3 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);
  });
  
  return <>{children}</>;
}

export default function BeautifulGrove() {
  const [menuFocus, setMenuFocus] = useState<string | null>(null);

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-amber-50 via-emerald-100 to-teal-200">
      <Canvas
        camera={{ position: [0, 3, 12], fov: 60 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          {/* Warm magical lighting */}
          <ambientLight intensity={0.8} color="#fff8e7" />
          <directionalLight 
            position={[8, 10, 5]} 
            intensity={0.6} 
            color="#ffd700"
            castShadow
          />
          <pointLight position={[-5, 3, -5]} intensity={0.3} color="#ffcc88" />

          <ScrollControls pages={3} damping={0.2}>
            <Scroll html>
              <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
                <div className="bg-white/30 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/40">
                  <h1 className="text-3xl font-bold text-emerald-800 mb-2 text-center">The Mystical Grove</h1>
                  <p className="text-emerald-700 text-center">Where butterflies dance in eternal light</p>
                </div>
              </div>
              <div className="w-full h-[300vh]" />
            </Scroll>
            
            <BeautifulTree menuFocus={menuFocus} setMenuFocus={setMenuFocus} />
            <MagicalButterflies count={40} />
            
            <CameraRig>
              <></>
            </CameraRig>
          </ScrollControls>
        </Suspense>
      </Canvas>
      
      {/* Navigation UI */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <div className="flex gap-4 bg-white/25 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/30">
          <button
            onClick={() => setMenuFocus('root')}
            className="px-8 py-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold shadow-lg transform transition hover:scale-105"
          >
            🌿 The Roots
          </button>
          <button
            onClick={() => setMenuFocus('trunk')}
            className="px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-lg transform transition hover:scale-105"
          >
            🌳 The Trunk
          </button>
          <button
            onClick={() => setMenuFocus('canopy')}
            className="px-8 py-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-lg transform transition hover:scale-105"
          >
            🍃 The Canopy
          </button>
        </div>
      </div>
      
      {/* Floating UI hints */}
      <div className="absolute top-1/2 right-8 transform -translate-y-1/2 z-10">
        <div className="bg-white/20 backdrop-blur-lg p-4 rounded-2xl shadow-lg text-emerald-800">
          <p className="text-sm font-medium mb-2">✨ Magical Controls</p>
          <p className="text-xs opacity-80">Scroll to explore</p>
          <p className="text-xs opacity-80">Move mouse for parallax</p>
          <p className="text-xs opacity-80">Click buttons to focus</p>
        </div>
      </div>
    </div>
  );
}