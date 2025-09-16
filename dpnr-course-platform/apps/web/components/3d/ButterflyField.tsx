'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

type State = 'free' | 'gather' | 'rest' | 'ascend' | 'disperse';

export function ButterflyField({
  count = 120,
  reducedMotion,
  scrollProgress = 0,
}: {
  count?: number;
  reducedMotion?: boolean;
  scrollProgress?: number;
}) {
  const { camera } = useThree();
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Attributes per instance
  const data = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    const velocities: THREE.Vector3[] = [];
    const wingPhase: number[] = [];
    const scales: number[] = [];
    const targets: (THREE.Vector3 | null)[] = [];
    const beh: State[] = [];
    for (let i = 0; i < count; i++) {
      positions.push(new THREE.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 3, (Math.random() - 0.5) * 6));
      velocities.push(new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02));
      wingPhase.push(Math.random() * Math.PI * 2);
      scales.push(0.25 + Math.random() * 0.25);
      targets.push(null);
      beh.push('free');
    }
    return { positions, velocities, wingPhase, scales, targets, beh };
  }, [count]);

  // Texture for wings (64x64 canvas)
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0,0,64,64);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    // left wing
    ctx.beginPath(); ctx.ellipse(22, 32, 14, 18, -Math.PI/6, 0, Math.PI*2); ctx.fill();
    // right wing
    ctx.beginPath(); ctx.ellipse(42, 32, 14, 18, Math.PI/6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(210,210,210,1)'; ctx.fillRect(31, 24, 2, 16);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
    return tex;
  }, []);

  // Geometry & material
  const geom = useMemo(() => new THREE.PlaneGeometry(1, 0.6), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false }), [texture]);

  // Update behavior state from scroll
  useEffect(() => {
    const { beh, targets } = data;
    const stages: State[] = ['free', 'gather', 'rest', 'ascend', 'disperse'];
    const idx = Math.min(stages.length - 1, Math.floor(scrollProgress * stages.length));
    const next = stages[idx];
    if (beh[0] !== next) {
      // initialize targets
      for (let i = 0; i < beh.length; i++) {
        beh[i] = next;
        if (next === 'gather') {
          targets[i] = new THREE.Vector3((Math.random() - 0.5) * 1.5, 3 + Math.random() * 1.5, (Math.random() - 0.5) * 1.5);
        } else if (next === 'rest') {
          const ang = Math.random() * Math.PI * 2; const r = 1 + Math.random() * 1.2;
          targets[i] = new THREE.Vector3(Math.cos(ang) * r, 3.2 + Math.random() * 1.3, Math.sin(ang) * r);
        } else if (next === 'disperse') {
          const ang = Math.random() * Math.PI * 2; const r = 4 + Math.random() * 3;
          targets[i] = new THREE.Vector3(Math.cos(ang) * r, 2 + Math.random() * 3, Math.sin(ang) * r);
        } else {
          targets[i] = null;
        }
      }
    }
  }, [scrollProgress, data]);

  // Animation loop
  useFrame((state) => {
    const mesh = meshRef.current; if (!mesh) return;
    const { positions, velocities, wingPhase, scales, targets, beh } = data;
    const dummy = new THREE.Object3D();
    const t = state.clock.getElapsedTime();
    for (let i = 0; i < positions.length; i++) {
      // Wing flap via scale X in matrix
      wingPhase[i] += reducedMotion ? 0 : 0.2;
      const flap = Math.max(0.2, Math.abs(Math.sin(wingPhase[i])));

      // Behavior steering
      if (!reducedMotion) {
        const p = positions[i];
        const v = velocities[i];
        const target = targets[i];
        if (beh[i] === 'gather' && target) {
          v.lerp(target.clone().sub(p).normalize().multiplyScalar(0.02), 0.05);
        } else if (beh[i] === 'rest' && target) {
          const d = target.clone().sub(p);
          v.lerp(d.normalize().multiplyScalar(0.02), 0.1);
          if (d.length() < 0.1) v.multiplyScalar(0.9);
        } else if (beh[i] === 'ascend') {
          v.y += 0.004; v.x += Math.sin(t + i) * 0.001; v.z += Math.cos(t + i) * 0.001;
        } else if (beh[i] === 'disperse' && target) {
          v.lerp(target.clone().sub(p).normalize().multiplyScalar(0.02), 0.05);
        } else {
          // free
          v.x += (Math.random() - 0.5) * 0.001;
          v.y += (Math.random() - 0.5) * 0.001;
          v.z += (Math.random() - 0.5) * 0.001;
        }

        // Integrate and bounds
        p.add(v);
        if (Math.abs(p.x) > 6) v.x *= -0.9;
        if (p.y < 1.0) { p.y = 1.0; v.y *= -0.5; }
        if (p.y > 6) v.y *= -0.9;
        if (Math.abs(p.z) > 6) v.z *= -0.9;
      }

      // Compose instance matrix
      const s = scales[i];
      dummy.position.copy(positions[i]);
      dummy.rotation.set(0, t * 0.2 + i * 0.1, 0);
      dummy.scale.set(s * flap, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    // @ts-ignore
    <instancedMesh ref={meshRef} args={[geom, mat, count]} castShadow={false} receiveShadow={false} />
  );
}

