'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, AdaptiveEvents, PerformanceMonitor, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { ProceduralTree } from './ProceduralTree';
import { ButterflyField } from './ButterflyField';
import { useFrame, useThree } from '@react-three/fiber';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);
  return reduced;
}

function useHeroScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      if (typeof window === 'undefined') return;
      const h = window.innerHeight || 1;
      const y = window.scrollY || 0;
      const p = Math.max(0, Math.min(1, y / h));
      setProgress(p);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return progress;
}

export function Hero3DResponsive() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const scrollProgress = useHeroScrollProgress();
  const [quality, setQuality] = useState<'low' | 'high'>('high');

  // Simple mobile detection to clamp counts
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  }, []);

  const leafCount = isMobile ? (quality === 'low' ? 150 : 220) : (quality === 'low' ? 220 : 320);
  const butterflyCount = isMobile ? (quality === 'low' ? 40 : 60) : (quality === 'low' ? 100 : 150);

  return (
    <div className="relative h-[60vh] md:h-screen">
      <Canvas
        shadows
        camera={{ position: [0, 2, 8], fov: 50 }}
        gl={{ antialias: quality === 'high', powerPreference: 'high-performance' }}
      >
        <PerformanceMonitor onDecline={() => setQuality('low')} onIncline={() => setQuality('high')} />
        <AdaptiveDpr pixelated={quality === 'low'} />
        <AdaptiveEvents />

        {/* Lights */}
        <ambientLight intensity={0.5} />
        <directionalLight
          castShadow
          intensity={0.8}
          position={[5, 10, 5]}
          shadow-mapSize-width={isMobile ? 512 : 1024}
          shadow-mapSize-height={isMobile ? 512 : 1024}
        />

        {/* Ground contact */}
        <ContactShadows position={[0, -0.01, 0]} opacity={0.4} blur={2.2} far={8} scale={15} />

        {/* Scene */}
        <group>
          <ProceduralTree reducedMotion={prefersReducedMotion} leafCount={leafCount} />
          <ButterflyField
            count={butterflyCount}
            reducedMotion={prefersReducedMotion}
            scrollProgress={scrollProgress}
          />
          <CameraRig progress={prefersReducedMotion ? 0 : scrollProgress} />
        </group>
      </Canvas>
    </div>
  );
}

function CameraRig({ progress }: { progress: number }) {
  const { camera } = useThree();
  useFrame(() => {
    // Two-keyframe dolly within hero: from farther to closer + slight height change
    const from = { x: 0, y: 2, z: 8, fov: 50 };
    const to = { x: 0.8, y: 2.6, z: 6.2, fov: 48 };
    const t = Math.max(0, Math.min(1, progress));
    camera.position.x = THREE.MathUtils.lerp(from.x, to.x, t);
    camera.position.y = THREE.MathUtils.lerp(from.y, to.y, t);
    camera.position.z = THREE.MathUtils.lerp(from.z, to.z, t);
    camera.fov = THREE.MathUtils.lerp(from.fov, to.fov, t);
    camera.lookAt(0, 3, 0);
    camera.updateProjectionMatrix();
  });
  return null;
}
