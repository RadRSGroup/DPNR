'use client';

import React, { Suspense, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, ScrollControls, useScroll, Scroll, Points, PointMaterial, shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';

// Enhanced shader material for deeper displacement effects
const EnhancedDisplacementMaterial = shaderMaterial(
  {
    colorMap: null,
    displacementMap: null,
    displacementScale: 3.5,
    displacementBias: -1.2,
    time: 0,
    scrollProgress: 0,
    lightDirection: new THREE.Vector3(0.5, 1, 0.5),
  },
  // Vertex Shader
  `
    uniform sampler2D displacementMap;
    uniform float displacementScale;
    uniform float displacementBias;
    uniform float time;
    uniform float scrollProgress;
    
    varying vec2 vUv;
    varying float vDisplacement;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vUv = uv;
      
      // Multi-sample displacement for smoother result
      vec2 samplePoint = uv;
      float displacement = texture2D(displacementMap, samplePoint).r;
      
      // Apply smoothstep for organic transitions
      displacement = smoothstep(0.1, 0.9, displacement);
      
      // Add organic wave distortion that changes with scroll
      float waveIntensity = 0.03 * (1.0 + scrollProgress * 0.5);
      displacement += sin(uv.x * 12.0 + time * 0.6) * waveIntensity;
      displacement += sin(uv.y * 8.0 + time * 0.4) * waveIntensity;
      displacement += sin((uv.x + uv.y) * 15.0 + time * 0.8) * waveIntensity * 0.5;
      
      // Calculate enhanced displacement
      vDisplacement = displacement;
      vec3 newPosition = position;
      
      // Apply dramatic displacement with bias
      newPosition.z += displacement * displacementScale + displacementBias;
      
      // Store world position for fragment shader
      vPosition = newPosition;
      vNormal = normal;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform sampler2D colorMap;
    uniform sampler2D displacementMap;
    uniform vec3 lightDirection;
    uniform float scrollProgress;
    varying vec2 vUv;
    varying float vDisplacement;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vec4 color = texture2D(colorMap, vUv);
      
      // Enhanced depth-based shading
      float depth = vDisplacement;
      float depthShading = 0.6 + depth * 0.7;
      
      // Ambient occlusion based on displacement
      float ao = smoothstep(0.2, 0.8, depth);
      float aoEffect = 0.4 + ao * 0.6;
      
      // Fake lighting based on displacement gradient
      vec2 gradientStep = vec2(1.0/512.0); // Based on texture resolution
      float gradX = texture2D(displacementMap, vUv + vec2(gradientStep.x, 0.0)).r - 
                   texture2D(displacementMap, vUv - vec2(gradientStep.x, 0.0)).r;
      float gradY = texture2D(displacementMap, vUv + vec2(0.0, gradientStep.y)).r - 
                   texture2D(displacementMap, vUv - vec2(0.0, gradientStep.y)).r;
      
      vec3 fakeNormal = normalize(vec3(-gradX, -gradY, 0.1));
      float lighting = max(0.3, dot(fakeNormal, normalize(lightDirection)));
      
      // Combine all lighting effects
      color.rgb *= depthShading * aoEffect * lighting;
      
      // Add subtle color temperature shift based on depth
      float warmth = smoothstep(0.0, 1.0, depth);
      color.rgb = mix(color.rgb, color.rgb * vec3(1.1, 1.05, 0.9), warmth * 0.3);
      
      // Enhance contrast in deeper areas
      color.rgb = mix(color.rgb, pow(color.rgb, vec3(1.2)), depth * 0.4);
      
      gl_FragColor = color;
    }
  `
);

extend({ EnhancedDisplacementMaterial });

// Camera waypoints for deeper perspective
const DEEP_CAMERA_WAYPOINTS = [
  {
    position: new THREE.Vector3(0, 0, 15),
    target: new THREE.Vector3(0, 0, 0),
    fov: 50,
    name: 'overview'
  },
  {
    position: new THREE.Vector3(3, -4, 12),
    target: new THREE.Vector3(0, -3, 2),
    fov: 60,
    name: 'roots-depth'
  },
  {
    position: new THREE.Vector3(-5, 0, 8),
    target: new THREE.Vector3(0, 0, 3),
    fov: 45,
    name: 'trunk-detail'
  },
  {
    position: new THREE.Vector3(6, 3, 10),
    target: new THREE.Vector3(0, 2, 4),
    fov: 55,
    name: 'branches-structure'
  },
  {
    position: new THREE.Vector3(0, 6, 12),
    target: new THREE.Vector3(0, 4, 5),
    fov: 40,
    name: 'canopy-heights'
  },
  {
    position: new THREE.Vector3(-8, 8, 6),
    target: new THREE.Vector3(0, 5, 8),
    fov: 65,
    name: 'aerial-view'
  }
];

function DeepScrollCamera() {
  const { camera } = useThree();
  const scroll = useScroll();
  
  useFrame(() => {
    const progress = scroll.offset;
    const scaledProgress = progress * (DEEP_CAMERA_WAYPOINTS.length - 1);
    const currentIndex = Math.floor(Math.max(0, Math.min(scaledProgress, DEEP_CAMERA_WAYPOINTS.length - 1)));
    const nextIndex = Math.min(currentIndex + 1, DEEP_CAMERA_WAYPOINTS.length - 1);
    const localProgress = Math.max(0, Math.min(1, scaledProgress - currentIndex));
    
    // Ultra-smooth easing
    const easeInOutQuart = (t: number) => {
      return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    };
    
    const easedProgress = easeInOutQuart(localProgress);
    
    const current = DEEP_CAMERA_WAYPOINTS[currentIndex];
    const next = DEEP_CAMERA_WAYPOINTS[nextIndex];
    
    if (!current || !next) return;
    
    // Smooth camera interpolation
    camera.position.lerpVectors(current.position, next.position, easedProgress);
    
    const currentTarget = current.target.clone();
    const nextTarget = next.target.clone();
    const interpolatedTarget = new THREE.Vector3().lerpVectors(
      currentTarget,
      nextTarget,
      easedProgress
    );
    camera.lookAt(interpolatedTarget);
    
    camera.fov = THREE.MathUtils.lerp(current.fov, next.fov, easedProgress);
    camera.updateProjectionMatrix();
  });
  
  return null;
}

function EnhancedDisplacementTree() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);
  const scroll = useScroll();
  
  // Load textures with enhanced processing
  const [colorMap, displacementMap] = useTexture([
    '/tree-color.png',
    '/tree-depth.png' 
  ]);

  // Process textures for optimal quality
  useEffect(() => {
    if (displacementMap) {
      displacementMap.anisotropy = 16;
      displacementMap.minFilter = THREE.LinearFilter;
      displacementMap.magFilter = THREE.LinearFilter;
      displacementMap.wrapS = THREE.ClampToEdgeWrapping;
      displacementMap.wrapT = THREE.ClampToEdgeWrapping;
      displacementMap.flipY = false;
    }
    
    if (colorMap) {
      colorMap.anisotropy = 16;
      colorMap.minFilter = THREE.LinearFilter;
      colorMap.magFilter = THREE.LinearFilter;
    }
  }, [colorMap, displacementMap]);

  useFrame((state) => {
    if (meshRef.current && materialRef.current) {
      const time = state.clock.getElapsedTime();
      const scrollProgress = scroll.offset;
      
      // Dynamic displacement that responds to scroll position
      const baseDisplacement = 3.5;
      const scrollModifier = 1 + Math.sin(scrollProgress * Math.PI * 2) * 0.6;
      const breathingEffect = 1 + Math.sin(time * 0.4) * 0.1;
      
      materialRef.current.displacementScale = baseDisplacement * scrollModifier * breathingEffect;
      materialRef.current.time = time;
      materialRef.current.scrollProgress = scrollProgress;
      
      // Dynamic bias for depth variation
      materialRef.current.displacementBias = -1.2 - scrollProgress * 0.5;
      
      // Subtle mesh rotation
      meshRef.current.rotation.z = Math.sin(time * 0.15) * 0.01;
      meshRef.current.rotation.x = Math.cos(time * 0.12) * 0.005;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      {/* Ultra-high subdivision for maximum smoothness */}
      <planeGeometry args={[15, 15, 1024, 1024]} />
      <enhancedDisplacementMaterial
        ref={materialRef}
        colorMap={colorMap}
        displacementMap={displacementMap}
        displacementScale={3.5}
        displacementBias={-1.2}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function MultiLayerDepthTree() {
  const [colorMap, displacementMap] = useTexture([
    '/tree-color.png',
    '/tree-depth.png' 
  ]);

  // Multiple layers for enhanced depth parallax
  const layers = [
    { scale: 3.5, opacity: 1.0, z: 0, bias: -1.2 },     // Main foreground
    { scale: 2.2, opacity: 0.4, z: -1, bias: -0.8 },   // Mid layer
    { scale: 1.5, opacity: 0.25, z: -2, bias: -0.5 },  // Background layer
  ];

  return (
    <group>
      {layers.map((layer, index) => (
        <mesh key={index} position={[0, 0, layer.z]}>
          <planeGeometry args={[15, 15, 512, 512]} />
          <meshStandardMaterial
            map={colorMap}
            displacementMap={displacementMap}
            displacementScale={layer.scale}
            displacementBias={layer.bias}
            transparent={index > 0}
            opacity={layer.opacity}
            roughness={0.9}
            metalness={0.02}
            depthWrite={index === 0}
          />
        </mesh>
      ))}
    </group>
  );
}

function EnhancedButterflies({ count = 40 }) {
  const pointsRef = useRef<THREE.Points>(null);
  const scroll = useScroll();
  const basePositions = useRef<Float32Array>();
  
  const positions = useMemo(() => {
    const temp = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const angle = (i / count) * Math.PI * 2;
      const radius = 3 + Math.random() * 8;
      const height = Math.random() * 20 - 5;
      
      temp[i3] = Math.cos(angle) * radius;
      temp[i3 + 1] = height;
      temp[i3 + 2] = Math.sin(angle) * radius;
    }
    basePositions.current = temp.slice();
    return temp;
  }, [count]);

  useFrame((state) => {
    if (pointsRef.current && basePositions.current) {
      const time = state.clock.getElapsedTime();
      const scrollProgress = scroll.offset;
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const baseX = basePositions.current[i3];
        const baseY = basePositions.current[i3 + 1];
        const baseZ = basePositions.current[i3 + 2];
        
        // Enhanced behavior based on camera section
        const section = Math.floor(scrollProgress * 6);
        let behaviorX = 0, behaviorY = 0, behaviorZ = 0;
        
        switch (section) {
          case 0: // Overview - gentle drift
            behaviorX = Math.sin(time * 0.5 + i * 0.1) * 1;
            behaviorY = Math.sin(time * 0.3 + i * 0.15) * 0.5;
            behaviorZ = Math.cos(time * 0.4 + i * 0.12) * 1;
            break;
          case 1: // Root depth - settling behavior
            behaviorX = Math.sin(time * 0.2 + i * 0.1) * 0.3;
            behaviorY = -Math.abs(Math.sin(time * 0.4 + i)) * 3;
            behaviorZ = Math.cos(time * 0.3 + i * 0.1) * 0.3;
            break;
          case 2: // Trunk detail - circular motion
            const trunkAngle = time * 0.3 + i * 0.2;
            behaviorX = Math.cos(trunkAngle) * 2;
            behaviorY = Math.sin(time * 0.5 + i) * 1;
            behaviorZ = Math.sin(trunkAngle) * 2;
            break;
          case 3: // Branch structure - upward spirals
            const spiralAngle = time * 0.4 + i * 0.3;
            behaviorX = Math.cos(spiralAngle) * 3;
            behaviorY = (time * 0.6 + i * 0.1) % 12;
            behaviorZ = Math.sin(spiralAngle) * 3;
            break;
          case 4: // Canopy heights - energetic dancing
            behaviorX = Math.sin(time * 1.2 + i * 0.1) * 2;
            behaviorY = Math.sin(time * 0.8 + i * 0.2) * 1 + 8;
            behaviorZ = Math.cos(time * 1.1 + i * 0.15) * 2;
            break;
          case 5: // Aerial view - wide circulation
            const aerialAngle = time * 0.15 + i * 0.05;
            behaviorX = Math.cos(aerialAngle) * 8;
            behaviorY = Math.sin(time * 0.3 + i) * 2 + 10;
            behaviorZ = Math.sin(aerialAngle) * 8;
            break;
        }
        
        positions[i3] = baseX + behaviorX;
        positions[i3 + 1] = baseY + behaviorY;
        positions[i3 + 2] = baseZ + behaviorZ;
      }
      
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#ffdd88"
        size={0.18}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </Points>
  );
}

function DeepScrollContent() {
  return (
    <Scroll html>
      <div className="w-screen" style={{ height: '600vh' }}>
        <div className="sticky top-0 w-screen h-screen flex items-center justify-center pointer-events-none">
          <div className="max-w-2xl mx-auto p-8">
            <div className="bg-black/10 backdrop-blur-3xl p-8 rounded-3xl shadow-2xl border border-white/20 text-center">
              <h1 className="text-5xl font-bold text-emerald-900 mb-4">The Deep Tree</h1>
              <p className="text-xl text-emerald-800 mb-2">Journey Into Living Depth</p>
              <p className="text-emerald-700">Enhanced displacement mapping reveals hidden dimensions</p>
            </div>
          </div>
        </div>
      </div>
    </Scroll>
  );
}

export default function DeeperTreeJourney() {
  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-amber-50 via-green-50 to-sky-100">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          {/* Enhanced atmospheric lighting */}
          <ambientLight intensity={0.4} color="#fff8e1" />
          <directionalLight 
            position={[8, 12, 8]} 
            intensity={1.2} 
            color="#ffd700"
            castShadow
          />
          <pointLight position={[-8, 8, -8]} intensity={0.6} color="#ffcc80" />
          <pointLight position={[8, -8, 8]} intensity={0.3} color="#87ceeb" />

          {/* 6 pages for deeper journey */}
          <ScrollControls pages={6} damping={0.05}>
            <DeepScrollCamera />
            <DeepScrollContent />
            
            {/* Choose one approach - Enhanced shader is most dramatic */}
            <EnhancedDisplacementTree />
            {/* Alternative: <MultiLayerDepthTree /> */}
            
            <EnhancedButterflies count={35} />
          </ScrollControls>
        </Suspense>
      </Canvas>
      
      {/* Enhanced progress indicator */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-20">
        <div className="bg-white/15 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-white/20">
          <div className="flex flex-col gap-3">
            {['Overview', 'Root Depths', 'Trunk Detail', 'Architecture', 'Canopy Heights', 'Aerial View'].map((label, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-600/40 border-2 border-emerald-600/60" />
                <span className="text-xs font-medium text-emerald-800 opacity-80">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Technical info */}
      <div className="absolute top-8 left-8 z-10">
        <div className="bg-black/15 backdrop-blur-xl p-6 rounded-2xl text-emerald-900 border border-black/20">
          <p className="font-bold mb-2 text-lg">🌊 Deep Displacement</p>
          <div className="text-sm space-y-1">
            <p>• 1024×1024 Subdivisions</p>
            <p>• Custom Shader Materials</p>
            <p>• 3.5× Displacement Scale</p>
            <p>• Multi-layer Depth Effects</p>
            <p>• Organic Wave Distortion</p>
          </div>
        </div>
      </div>
    </div>
  );
}