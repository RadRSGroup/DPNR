'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';

export function ProceduralTree({ reducedMotion, leafCount = 300 }: { reducedMotion?: boolean; leafCount?: number }) {
  const group = useMemo(() => new THREE.Group(), []);

  // Trunk using Lathe profile for root flare + subtle twist
  const trunk = useMemo(() => {
    const height = 6;
    const segments = 20;
    const profile: THREE.Vector2[] = [];
    // Build a bell-shaped profile from base (y=0) to top (y=height)
    for (let i = 0; i <= segments; i++) {
      const t = i / segments; // 0..1 up the trunk
      const y = t * height;
      // radius curve: flare at base, taper to top
      const baseFlare = 1.4 - 0.8 * t; // 1.4 -> 0.6
      const radius = 0.6 * (1 - 0.2 * Math.sin(t * Math.PI)) * (t < 0.15 ? baseFlare : 1 - 0.35 * t);
      profile.push(new THREE.Vector2(radius, y));
    }
    const g = new THREE.LatheGeometry(profile, 24);
    // Organic twist + noise
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = y / height;
      const angle = t * 0.35; // twist strength
      const x0 = pos.getX(i);
      const z0 = pos.getZ(i);
      const x = x0 * Math.cos(angle) - z0 * Math.sin(angle);
      const z = x0 * Math.sin(angle) + z0 * Math.cos(angle);
      // Bark ripples
      const ripple = (Math.sin((x0 + z0) * 6 + t * 10) * 0.015) * (0.4 + t);
      pos.setX(i, x + ripple);
      pos.setZ(i, z + ripple);
    }
    g.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ color: 0x574332, roughness: 0.95, metalness: 0.02 });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.y = 0; // base on ground; we lift entire group later
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.y = 0.5; // slight lift for ContactShadows
    return mesh;
  }, []);

  const branches = useMemo(() => {
    const arr: THREE.Mesh[] = [];
    const levels = [
      { h: 3.0, a: Math.PI / 6 },
      { h: 3.6, a: Math.PI / 5 },
      { h: 4.2, a: Math.PI / 4 },
      { h: 4.8, a: Math.PI / 5 },
      { h: 5.2, a: Math.PI / 6 },
    ];
    levels.forEach((lv, i) => {
      const g = new THREE.CylinderGeometry(0.18, 0.36, 2.6, 10, 4);
      const m = new THREE.MeshStandardMaterial({ color: 0x4a3c28, roughness: 0.9 });
      const b = new THREE.Mesh(g, m);
      b.position.y = lv.h;
      b.rotation.z = lv.a;
      const rot = (i * (Math.PI * 2)) / levels.length;
      b.rotation.y = rot;
      b.position.x = Math.cos(rot) * 0.55;
      b.position.z = Math.sin(rot) * 0.55;
      b.castShadow = true;
      b.receiveShadow = true;
      arr.push(b);
    });
    return arr;
  }, []);

  // Second-level curved twigs for richer canopy
  const twigs = useMemo(() => {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x4a3c28, roughness: 0.95 });
    const curveFor = (base: THREE.Vector3, dir: THREE.Vector3) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const p = base.clone().add(dir.clone().multiplyScalar(1.3 * t));
        p.y += t * 0.6 + Math.sin(t * Math.PI) * 0.2;
        p.x += (Math.random() - 0.5) * 0.1 * (1 - t);
        p.z += (Math.random() - 0.5) * 0.1 * (1 - t);
        pts.push(p);
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve, 8, 0.05, 6, false);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true; mesh.receiveShadow = true;
      group.add(mesh);
    };
    // seed around crown
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const base = new THREE.Vector3(Math.cos(ang) * 0.8, 4.2 + Math.random()*1.2, Math.sin(ang) * 0.8);
      const dir = new THREE.Vector3(Math.cos(ang) * 0.7, 0.2 + Math.random()*0.4, Math.sin(ang) * 0.7);
      curveFor(base, dir);
    }
    return group;
  }, []);

  const leaves = useMemo(() => {
    // Instanced small quads as leaves clustered near branch tips
    const count = leafCount;
    const geom = new THREE.PlaneGeometry(0.25, 0.35);
    // simple greenish material, double side, slight translucency
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.95, alphaTest: 0.3, vertexColors: true });
    const mesh = new THREE.InstancedMesh(geom, mat, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const ring = 1 + Math.random();
      const ang = Math.random() * Math.PI * 2;
      const y = 3.2 + Math.random() * 2.3;
      dummy.position.set(Math.cos(ang) * ring, y + (Math.random() - 0.5) * 0.6, Math.sin(ang) * ring);
      dummy.rotation.set(Math.random() * 0.2, Math.random() * Math.PI * 2, Math.random() * 0.2);
      const s = 0.6 + Math.random() * 0.6;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      // per‑instance color jitter
      const c = new THREE.Color().setHSL(0.32 + Math.random() * 0.05, 0.45 + Math.random()*0.15, 0.45 + Math.random()*0.15);
      // Instance color per leaf
      mesh.setColorAt?.(i, c);
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }, [leafCount]);

  // Compose
  group.position.y = 2.5; // raise whole tree to center better
  group.add(trunk);
  branches.forEach(b => group.add(b));
  group.add(twigs);
  group.add(leaves);

  return <primitive object={group} />;
}
