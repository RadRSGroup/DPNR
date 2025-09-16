'use client';
import { useMemo } from 'react';
import * as THREE from 'three';

export function LightShafts({
  count = 10,
  direction = new THREE.Vector3(-1, -0.6, -0.3),
  color = '#fff7d1',
}: {
  count?: number;
  direction?: THREE.Vector3;
  color?: string;
}) {
  const mesh = useMemo(() => {
    // Create a soft radial gradient texture for shafts
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grd = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grd.addColorStop(0, `${color}AA`);
    grd.addColorStop(1, `${color}00`);
    ctx.fillStyle = grd; ctx.fillRect(0,0,size,size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const geom = new THREE.PlaneGeometry(6, 10);
    const m = new THREE.InstancedMesh(geom, mat, count);
    const d = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      d.position.set((Math.random()-0.5)*3, 2.5 + Math.random()*2, (Math.random()-0.5)*3);
      d.rotation.set(direction.y*0.4, Math.atan2(direction.x, direction.z), direction.z*0.1);
      d.scale.set(1, 1 + Math.random()*1.3, 1);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    }
    return m;
  }, [count, color, direction]);

  return <primitive object={mesh} />;
}

