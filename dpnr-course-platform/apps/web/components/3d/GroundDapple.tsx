'use client';
import { useMemo } from 'react';
import * as THREE from 'three';

export function GroundDapple() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#e6f3e6';
    ctx.fillRect(0,0,256,256);
    ctx.globalCompositeOperation = 'destination-out';
    // draw many soft circles to create a mottled leaf‑litter light pattern
    for (let i=0;i<140;i++){
      const x = Math.random()*256; const y = Math.random()*256; const r = 6+Math.random()*18;
      const grd = ctx.createRadialGradient(x,y,0,x,y,r);
      grd.addColorStop(0,'rgba(0,0,0,0.18)');
      grd.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3,3);
    return tex;
  }, []);

  return (
    <mesh rotation-x={-Math.PI/2} position={[0,0,0]} receiveShadow>
      <planeGeometry args={[40,40]} />
      <meshBasicMaterial map={texture} transparent opacity={0.6} color={'#e8f4e8'} />
    </mesh>
  );
}

