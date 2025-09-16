'use client';

// EXACT implementation per PRD (Landing Page Only)
import { Canvas } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';

export function Hero3D() {
  return (
    <div className="relative h-[60vh] md:h-screen">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <Float speed={2} rotationIntensity={0.5}>
          <mesh>
            <sphereGeometry args={[1, 32, 32]} />
            <MeshDistortMaterial color="#8b5cf6" distort={0.3} speed={2} />
          </mesh>
        </Float>
      </Canvas>
    </div>
  );
}

