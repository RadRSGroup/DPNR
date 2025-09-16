# DPNR Responsive 3D Framework
## Inspired by RS Group's Interactive Approach

---

## 🎯 Framework Overview

This framework provides production-ready components for creating responsive 3D elements similar to RS Group's website, which features:
- **Scroll-triggered 3D animations**
- **Interactive product showcases**
- **Performance-optimized loading**
- **Mobile-responsive fallbacks**
- **Smooth transitions between states**

---

## 📦 Core Tech Stack

```json
{
  "dependencies": {
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.88.0",
    "@react-three/postprocessing": "^2.15.0",
    "three": "^0.158.0",
    "framer-motion": "^10.16.0",
    "leva": "^0.9.35",
    "@use-gesture/react": "^10.3.0",
    "zustand": "^4.4.0"
  }
}
```

---

## 🏗️ Framework Architecture

```
/components/3d-framework/
├── /core
│   ├── ResponsiveCanvas.tsx      # Adaptive canvas wrapper
│   ├── ScrollScene.tsx            # Scroll-triggered scenes
│   └── PerformanceMonitor.tsx    # FPS & quality adaptation
├── /scenes
│   ├── HeroScene.tsx             # Landing page hero
│   ├── ProductShowcase.tsx       # Interactive product display
│   ├── DataVisualization.tsx     # 3D data charts
│   └── CourseUniverse.tsx        # Course navigation
├── /controls
│   ├── TouchControls.tsx         # Mobile gestures
│   ├── MouseControls.tsx         # Desktop interactions
│   └── ScrollControls.tsx        # Scroll animations
├── /optimizations
│   ├── LODManager.tsx            # Level of detail
│   ├── LazyLoader.tsx            # Progressive loading
│   └── QualityAdapter.tsx        # Dynamic quality
└── /utils
    ├── deviceDetection.ts        # Device capabilities
    ├── performanceMetrics.ts     # Performance tracking
    └── animations.ts              # Reusable animations
```

---

## 🎭 Component 1: Responsive Canvas Wrapper

This is the foundation that adapts to device capabilities:

```tsx
// components/3d-framework/core/ResponsiveCanvas.tsx
'use client';

import { Canvas } from '@react-three/fiber';
import { Preload, PerformanceMonitor, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import { Suspense, useEffect, useState } from 'react';
import { useDeviceDetection } from '../utils/deviceDetection';

interface ResponsiveCanvasProps {
  children: React.ReactNode;
  className?: string;
  fallback?: React.ReactNode;
}

export function ResponsiveCanvas({ children, className, fallback }: ResponsiveCanvasProps) {
  const device = useDeviceDetection();
  const [dpr, setDpr] = useState<[number, number]>([1, 2]);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    // Adapt quality based on device
    if (device.isMobile) {
      setDpr([0.5, 1]);
      setQuality('low');
    } else if (device.isTablet) {
      setDpr([1, 1.5]);
      setQuality('medium');
    } else {
      setDpr([1, 2]);
      setQuality('high');
    }
  }, [device]);

  // Fallback for unsupported devices
  if (!device.hasWebGL) {
    return <div className={className}>{fallback || <StaticFallback />}</div>;
  }

  return (
    <Canvas
      className={className}
      dpr={dpr}
      camera={{ position: [0, 0, 5], fov: 50 }}
      gl={{
        antialias: quality !== 'low',
        alpha: true,
        powerPreference: device.isMobile ? 'low-power' : 'high-performance',
      }}
    >
      <Suspense fallback={<LoadingMesh />}>
        <PerformanceMonitor
          onIncline={() => setQuality('high')}
          onDecline={() => setQuality('low')}
          flipflops={3}
          onFallback={() => setQuality('low')}
        >
          <AdaptiveDpr pixelated />
          <AdaptiveEvents />
          {children}
        </PerformanceMonitor>
      </Suspense>
      <Preload all />
    </Canvas>
  );
}

function LoadingMesh() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#8b5cf6" wireframe />
    </mesh>
  );
}

function StaticFallback() {
  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-600 to-pink-600">
      <p className="text-white text-xl">3D content not supported on this device</p>
    </div>
  );
}
```

---

## 🎭 Component 2: Scroll-Triggered 3D Scene

Similar to RS Group's scroll animations:

```tsx
// components/3d-framework/core/ScrollScene.tsx
'use client';

import { useScroll, ScrollControls, useIntersect } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

interface ScrollSceneProps {
  children: React.ReactNode;
  pages?: number;
}

export function ScrollScene({ children, pages = 3 }: ScrollSceneProps) {
  return (
    <ScrollControls pages={pages} damping={0.1}>
      <ScrollContent>{children}</ScrollContent>
    </ScrollControls>
  );
}

function ScrollContent({ children }: { children: React.ReactNode }) {
  const scroll = useScroll();
  const { camera } = useThree();
  
  useFrame(() => {
    // Camera movement based on scroll
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      -scroll.offset * 5,
      0.1
    );
    
    // Rotation based on scroll
    camera.rotation.z = scroll.offset * Math.PI * 0.1;
  });

  return <>{children}</>;
}

// Animated element that appears on scroll
export function ScrollElement({ 
  position = [0, 0, 0],
  threshold = 0.5,
  children 
}: {
  position?: [number, number, number];
  threshold?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const scroll = useScroll();
  const [visible, setVisible] = useState(false);
  
  useFrame(() => {
    if (ref.current) {
      // Fade in/out based on scroll position
      const opacity = THREE.MathUtils.clamp(
        (scroll.offset - threshold) * 10,
        0,
        1
      );
      
      ref.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material.opacity = opacity;
          child.material.transparent = true;
        }
      });
      
      // Scale animation
      const scale = 0.5 + opacity * 0.5;
      ref.current.scale.setScalar(scale);
      
      // Rotation animation
      ref.current.rotation.y = scroll.offset * Math.PI * 2;
    }
  });

  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}
```

---

## 🎭 Component 3: Interactive Product Showcase

RS Group-style product viewer:

```tsx
// components/3d-framework/scenes/ProductShowcase.tsx
'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { 
  Float, 
  ContactShadows, 
  Environment, 
  PresentationControls,
  Center,
  Text3D,
  useGLTF,
  Html
} from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

interface ProductShowcaseProps {
  modelPath?: string;
  title: string;
  features: Array<{
    position: [number, number, number];
    label: string;
    description: string;
  }>;
}

export function ProductShowcase({ 
  modelPath = '/models/product.glb',
  title,
  features 
}: ProductShowcaseProps) {
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // Load 3D model
  const { scene } = useGLTF(modelPath);
  
  // Hover animation
  const [hovered, setHovered] = useState(false);
  const { scale } = useSpring({
    scale: hovered ? 1.1 : 1,
    config: { mass: 1, tension: 180, friction: 12 }
  });

  // Auto-rotate when not interacting
  useFrame((state) => {
    if (groupRef.current && !hovered) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
      
      <PresentationControls
        global
        zoom={0.8}
        rotation={[0, -Math.PI / 4, 0]}
        polar={[-Math.PI / 6, Math.PI / 6]}
        azimuth={[-Math.PI / 4, Math.PI / 4]}
      >
        <Float rotationIntensity={0.5}>
          <animated.group
            ref={groupRef}
            scale={scale}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
          >
            <Center>
              <primitive object={scene} />
            </Center>
            
            {/* Feature hotspots */}
            {features.map((feature, index) => (
              <Hotspot
                key={index}
                position={feature.position}
                label={feature.label}
                description={feature.description}
                isActive={activeFeature === index}
                onClick={() => setActiveFeature(index === activeFeature ? null : index)}
              />
            ))}
          </animated.group>
        </Float>
      </PresentationControls>
      
      <ContactShadows
        position={[0, -2, 0]}
        opacity={0.5}
        scale={10}
        blur={2.5}
        far={4}
      />
    </>
  );
}

function Hotspot({ 
  position, 
  label, 
  description, 
  isActive, 
  onClick 
}: {
  position: [number, number, number];
  label: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  
  return (
    <group position={position}>
      <mesh
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color={hovered ? '#ff6b6b' : '#8b5cf6'}
          emissive={hovered ? '#ff6b6b' : '#8b5cf6'}
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {isActive && (
        <Html
          position={[0, 0.5, 0]}
          center
          distanceFactor={8}
          style={{
            transition: 'all 0.2s',
            opacity: isActive ? 1 : 0,
            transform: `scale(${isActive ? 1 : 0.5})`
          }}
        >
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-xl max-w-xs">
            <h3 className="font-bold text-gray-900 mb-1">{label}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </Html>
      )}
    </group>
  );
}
```

---

## 🎭 Component 4: Hero Scene with Particles

Landing page hero similar to RS Group:

```tsx
// components/3d-framework/scenes/HeroScene.tsx
'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float, Sparkles, Cloud, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';

export function HeroScene() {
  const textRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // Animated entrance
  const { scale, rotation } = useSpring({
    from: { scale: 0, rotation: [0, 0, 0] },
    to: { scale: 1, rotation: [0, Math.PI * 2, 0] },
    config: { mass: 1, tension: 120, friction: 14 },
  });

  // Floating animation
  useFrame((state) => {
    if (textRef.current) {
      textRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  // Particle field
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 100; i++) {
      const x = (Math.random() - 0.5) * 10;
      const y = (Math.random() - 0.5) * 10;
      const z = (Math.random() - 0.5) * 10;
      temp.push([x, y, z]);
    }
    return temp;
  }, []);

  return (
    <>
      <fog attach="fog" args={['#000000', 5, 15]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      
      <animated.group ref={groupRef} scale={scale} rotation={rotation}>
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <Text
            ref={textRef}
            font="/fonts/inter-bold.woff"
            fontSize={1.5}
            color="#8b5cf6"
            anchorX="center"
            anchorY="middle"
          >
            DPNR
            <meshStandardMaterial
              color="#8b5cf6"
              emissive="#8b5cf6"
              emissiveIntensity={0.5}
            />
          </Text>
        </Float>
        
        <Sparkles
          count={50}
          scale={5}
          size={2}
          speed={0.5}
          color="#8b5cf6"
        />
        
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
        />
      </animated.group>
      
      {/* Floating particles */}
      {particles.map((position, i) => (
        <FloatingParticle key={i} position={position} />
      ))}
    </>
  );
}

function FloatingParticle({ position }: { position: number[] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const speed = Math.random() * 0.5 + 0.5;
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = 
        position[1] + Math.sin(state.clock.elapsedTime * speed) * 2;
      meshRef.current.rotation.x = state.clock.elapsedTime * speed;
      meshRef.current.rotation.y = state.clock.elapsedTime * speed * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} position={position as [number, number, number]}>
      <dodecahedronGeometry args={[0.05, 0]} />
      <meshStandardMaterial
        color="#8b5cf6"
        emissive="#8b5cf6"
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}
```

---

## 🎭 Component 5: Performance Optimization Manager

```tsx
// components/3d-framework/optimizations/QualityAdapter.tsx
'use client';

import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';

export function QualityAdapter({ children }: { children: React.ReactNode }) {
  const { gl, scene } = useThree();
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [fps, setFps] = useState(60);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        setFps(frameCount);
        
        // Adapt quality based on FPS
        if (frameCount < 30 && quality !== 'low') {
          setQuality('low');
        } else if (frameCount > 50 && quality === 'low') {
          setQuality('medium');
        } else if (frameCount > 55 && quality === 'medium') {
          setQuality('high');
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    measureFPS();
  }, [quality]);

  // Apply quality settings
  useEffect(() => {
    switch (quality) {
      case 'low':
        gl.setPixelRatio(0.5);
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = false;
            child.receiveShadow = false;
          }
        });
        break;
      case 'medium':
        gl.setPixelRatio(1);
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = false;
          }
        });
        break;
      case 'high':
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        break;
    }
  }, [quality, gl, scene]);

  return (
    <>
      {children}
      {quality === 'high' && (
        <EffectComposer>
          <Bloom intensity={0.5} />
          <ChromaticAberration offset={[0.0005, 0.0005]} />
        </EffectComposer>
      )}
      {/* FPS Counter for development */}
      {process.env.NODE_ENV === 'development' && (
        <Html>
          <div className="fixed top-4 right-4 bg-black/50 text-white p-2 rounded">
            FPS: {fps} | Quality: {quality}
          </div>
        </Html>
      )}
    </>
  );
}
```

---

## 🎭 Component 6: Device Detection Utility

```typescript
// components/3d-framework/utils/deviceDetection.ts

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
  hasWebGL: boolean;
  hasWebGL2: boolean;
  gpuTier: 'low' | 'medium' | 'high';
  screenSize: 'small' | 'medium' | 'large';
}

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    hasTouch: false,
    hasWebGL: true,
    hasWebGL2: true,
    gpuTier: 'medium',
    screenSize: 'large',
  });

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const userAgent = navigator.userAgent.toLowerCase();
      
      // Detect device type
      const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/.test(userAgent);
      const isTablet = /ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(userAgent);
      const isDesktop = !isMobile && !isTablet;
      
      // Detect touch capability
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Detect WebGL support
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      const hasWebGL = !!gl;
      const hasWebGL2 = !!canvas.getContext('webgl2');
      
      // Detect GPU tier (simplified)
      let gpuTier: 'low' | 'medium' | 'high' = 'medium';
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          // Simplified GPU detection
          if (renderer.includes('Intel') || isMobile) {
            gpuTier = 'low';
          } else if (renderer.includes('NVIDIA') || renderer.includes('AMD')) {
            gpuTier = 'high';
          }
        }
      }
      
      // Detect screen size
      let screenSize: 'small' | 'medium' | 'large' = 'large';
      if (width < 768) screenSize = 'small';
      else if (width < 1024) screenSize = 'medium';
      
      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        hasTouch,
        hasWebGL,
        hasWebGL2,
        gpuTier,
        screenSize,
      });
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  return deviceInfo;
}
```

---

## 🎯 Implementation in Your DPNR Course Platform

### 1. Landing Page with Hero Scene

```tsx
// app/page.tsx
import { ResponsiveCanvas } from '@/components/3d-framework/core/ResponsiveCanvas';
import { HeroScene } from '@/components/3d-framework/scenes/HeroScene';
import { ScrollScene, ScrollElement } from '@/components/3d-framework/core/ScrollScene';

export default function LandingPage() {
  return (
    <div className="relative">
      {/* 3D Hero Section */}
      <section className="h-screen relative">
        <ResponsiveCanvas
          className="absolute inset-0"
          fallback={
            <div className="h-full bg-gradient-to-br from-purple-600 to-pink-600" />
          }
        >
          <HeroScene />
        </ResponsiveCanvas>
        
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-6xl font-bold mb-4">DPNR Course Platform</h1>
            <p className="text-xl mb-8">Transform Your Inner World</p>
            <button className="px-8 py-4 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition">
              Start Your Journey
            </button>
          </div>
        </div>
      </section>

      {/* Scroll-triggered 3D Sections */}
      <section className="h-screen relative">
        <ResponsiveCanvas className="absolute inset-0">
          <ScrollScene pages={3}>
            <ScrollElement position={[0, 0, 0]} threshold={0.2}>
              <mesh>
                <boxGeometry args={[2, 2, 2]} />
                <meshStandardMaterial color="#8b5cf6" />
              </mesh>
            </ScrollElement>
            
            <ScrollElement position={[3, -2, 0]} threshold={0.5}>
              <mesh>
                <sphereGeometry args={[1, 32, 32]} />
                <meshStandardMaterial color="#ff6b6b" />
              </mesh>
            </ScrollElement>
          </ScrollScene>
        </ResponsiveCanvas>
      </section>
    </div>
  );
}
```

### 2. Course Showcase Page

```tsx
// app/course/page.tsx
import { ResponsiveCanvas } from '@/components/3d-framework/core/ResponsiveCanvas';
import { ProductShowcase } from '@/components/3d-framework/scenes/ProductShowcase';

export default function CoursePage() {
  const courseFeatures = [
    {
      position: [1, 0, 0] as [number, number, number],
      label: 'Interactive Lessons',
      description: 'Engage with 3D visualizations'
    },
    {
      position: [-1, 0, 0] as [number, number, number],
      label: 'Personal Growth',
      description: 'Track your transformation'
    },
    {
      position: [0, 1, 0] as [number, number, number],
      label: 'Community Support',
      description: 'Connect with others'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-purple-900">
      <div className="h-screen relative">
        <ResponsiveCanvas className="absolute inset-0">
          <ProductShowcase
            modelPath="/models/course-symbol.glb"
            title="DPNR Course"
            features={courseFeatures}
          />
        </ResponsiveCanvas>
        
        <div className="relative z-10 p-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Course Overview
          </h1>
          <p className="text-white/80 max-w-md">
            Explore our interactive course structure in 3D
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## 🚀 Performance Best Practices

### 1. **Lazy Loading**
```tsx
const ProductModel = lazy(() => import('./ProductModel'));
```

### 2. **Texture Optimization**
```tsx
// Use compressed textures
const texture = useTexture('/textures/compressed.ktx2');
```

### 3. **Instance Rendering**
```tsx
<Instances limit={1000} position={[0, 0, 0]}>
  <boxGeometry />
  <meshStandardMaterial />
</Instances>
```

### 4. **Level of Detail (LOD)**
```tsx
<LOD distances={[0, 10, 25]}>
  <mesh geometry={highDetail} />
  <mesh geometry={mediumDetail} />
  <mesh geometry={lowDetail} />
</LOD>
```

---

## 📱 Mobile Optimization

### Touch Controls
```tsx
import { useGesture } from '@use-gesture/react';

const bind = useGesture({
  onDrag: ({ offset: [x, y] }) => {
    // Handle touch drag
  },
  onPinch: ({ offset: [scale] }) => {
    // Handle pinch zoom
  }
});
```

### Reduced Quality Settings
```tsx
const mobileSettings = {
  shadows: false,
  antialias: false,
  pixelRatio: 0.5,
  maxLights: 2
};
```

---

## 🎨 Visual Effects Library

### Glow Effect
```tsx
<mesh>
  <sphereGeometry />
  <MeshDistortMaterial
    color="#8b5cf6"
    emissive="#8b5cf6"
    emissiveIntensity={0.5}
    distort={0.3}
    speed={2}
  />
</mesh>
```

### Particle Systems
```tsx
<Points limit={1000} range={100}>
  <PointMaterial
    size={0.05}
    color="#8b5cf6"
    sizeAttenuation
    transparent
  />
</Points>
```

---

## 🔧 Debugging Tools

```tsx
// Development-only controls
{process.env.NODE_ENV === 'development' && (
  <>
    <OrbitControls />
    <Stats />
    <Leva />
    <gridHelper />
    <axesHelper />
  </>
)}
```

---

## 📚 Resources & References

- [Three.js Documentation](https://threejs.org/docs/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Drei Helper Library](https://github.com/pmndrs/drei)
- [WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)

---

## 🎯 Quick Start Commands

```bash
# Install dependencies
npm install three @react-three/fiber @react-three/drei

# Install optimization tools
npm install @react-three/postprocessing leva

# Install animation libraries
npm install framer-motion @use-gesture/react

# Install state management
npm install zustand

# Run development
npm run dev
```

This framework provides everything needed to create RS Group-style responsive 3D elements in your DPNR Course Platform!