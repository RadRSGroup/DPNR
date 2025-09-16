'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr, AdaptiveEvents, PerformanceMonitor, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { ProceduralTree } from './ProceduralTree';
import { ButterflyField } from './ButterflyField';
import { LightShafts } from './LightShafts';
import { GroundDapple } from './GroundDapple';
import { EffectComposer, GodRays, DepthOfField, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);
  return reduced;
}

function useSectionProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      setProgress(Math.min(1, Math.max(0, p)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return progress;
}

export function ForestStage() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const scroll = useSectionProgress();
  const [quality, setQuality] = useState<'low'|'high'>('high');
  const isMobile = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches, []);
  const leafCount = isMobile ? (quality === 'low' ? 150 : 220) : (quality === 'low' ? 220 : 350);
  const butterflyCount = isMobile ? (quality === 'low' ? 40 : 60) : (quality === 'low' ? 90 : 140);
  const [sunColor] = useState('#fff5cc');
  const sunRef = useRef<THREE.Mesh>(null);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Canvas
        shadows
        camera={{ position: [0, 2.2, 8], fov: 50 }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          scene.fog = new THREE.Fog(new THREE.Color('#cfe8cf'), 5, 22);
        }}
      >
        <PerformanceMonitor onDecline={() => setQuality('low')} onIncline={() => setQuality('high')} />
        <AdaptiveDpr pixelated={quality==='low'} />
        <AdaptiveEvents />

        {/* Lighting */}
        <ambientLight intensity={0.55} />
        <directionalLight castShadow intensity={1.05} position={[6, 10, 4]} shadow-mapSize-width={isMobile?512:1536} shadow-mapSize-height={isMobile?512:1536} />

        {/* Ground & shafts */}
        <ContactShadows position={[0, -0.02, 0]} opacity={0.45} blur={2.5} far={10} scale={18} />
        <GroundDapple />
        {!isMobile && !prefersReducedMotion && <LightShafts count={10} />}

        <group>
          <ProceduralTree reducedMotion={prefersReducedMotion} leafCount={leafCount} />
          <ButterflyField count={butterflyCount} reducedMotion={prefersReducedMotion} scrollProgress={prefersReducedMotion?0:scroll} />
          <CameraPath progress={prefersReducedMotion?0:scroll} />
          {/* Sun occluder for GodRays */}
          {!isMobile && !prefersReducedMotion && (
            <mesh ref={sunRef} position={[3.2, 6.0, -2.5]}>
              <sphereGeometry args={[0.45, 16, 16]} />
              <meshBasicMaterial color={sunColor} />
            </mesh>
          )}
        </group>

        {/* True postprocessing on desktop for final mood */}
        {!isMobile && !prefersReducedMotion && (
          <EffectComposer multisampling={0} disableNormalPass>
            <GodRays
              sun={sunRef}
              samples={30}
              density={0.9}
              decay={0.96}
              weight={0.35}
              exposure={0.9}
              clampMax={1.0}
            />
            <DepthOfField focusDistance={0.02} focalLength={0.02} bokehScale={1.5} />
            <Bloom intensity={0.35} luminanceThreshold={0.7} luminanceSmoothing={0.2} />
            <Vignette eskil={false} offset={0.35} darkness={0.3} blendFunction={BlendFunction.Normal} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}

function CameraPath({ progress }: { progress: number }) {
  const { camera } = useThree();
  useFrame(() => {
    // 5 keyframes to mimic sections: roots, trunk, mid‑canopy, canopy glow, exit
    const keys = [
      { p:[0,1.6,9], look:[0,2.5,0], f:52 },
      { p:[0.6,2.2,7.5], look:[0,3,0], f:50 },
      { p:[-0.4,3.2,6.4], look:[0,3.5,0], f:49 },
      { p:[0.2,3.8,6.0], look:[0,3.8,0], f:48 },
      { p:[0,2.5,7.0], look:[0,3,0], f:50 },
    ];
    const t = Math.min(0.999, Math.max(0, progress));
    const seg = Math.floor(t * (keys.length - 1));
    const local = (t * (keys.length - 1)) - seg;
    const a = keys[seg]; const b = keys[Math.min(seg+1, keys.length-1)];
    camera.position.set(
      THREE.MathUtils.lerp(a.p[0], b.p[0], local),
      THREE.MathUtils.lerp(a.p[1], b.p[1], local),
      THREE.MathUtils.lerp(a.p[2], b.p[2], local),
    );
    camera.fov = THREE.MathUtils.lerp(a.f, b.f, local);
    const lx = THREE.MathUtils.lerp(a.look[0], b.look[0], local);
    const ly = THREE.MathUtils.lerp(a.look[1], b.look[1], local);
    const lz = THREE.MathUtils.lerp(a.look[2], b.look[2], local);
    camera.lookAt(lx, ly, lz);
    camera.updateProjectionMatrix();
  });
  return null;
}
