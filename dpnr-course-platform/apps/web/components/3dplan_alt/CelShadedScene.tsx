import React, { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, 
  Environment, 
  Loader, 
  PerformanceMonitor,
  AdaptiveDpr,
  AdaptiveEvents,
  Plane,
} from '@react-three/drei';
import { EffectComposer, Outline, Selection } from '@react-three/postprocessing';
import * as THREE from 'three';
import { CelShadedTree } from './CelShadedTree';
import { ButterflyParticles } from './ButterflyParticles';
import { FogAndLighting } from './FogAndLighting';

interface CelShadedSceneProps {
  className?: string;
  enableControls?: boolean;
  autoRotate?: boolean;
  performanceMode?: 'high' | 'medium' | 'low';
}

function SceneContent({ performanceMode = 'high' }: { performanceMode: CelShadedSceneProps['performanceMode'] }) {
  const sceneRef = useRef<THREE.Group>(null);
  
  // Performance-based settings
  const settings = {
    high: {
      butterflies: 15,
      fogDensity: 0.12,
      godRaysIntensity: 0.6,
      shadows: true,
      antialias: true,
    },
    medium: {
      butterflies: 10,
      fogDensity: 0.08,
      godRaysIntensity: 0.4,
      shadows: true,
      antialias: false,
    },
    low: {
      butterflies: 6,
      fogDensity: 0.05,
      godRaysIntensity: 0.2,
      shadows: false,
      antialias: false,
    },
  };
  
  const currentSettings = settings[performanceMode];

  return (
    <group ref={sceneRef}>
      {/* Ground plane with cel-shaded grass effect */}
      <Plane
        position={[0, -0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        args={[20, 20]}
        receiveShadow
      >
        <meshLambertMaterial 
          color={new THREE.Color(0.4, 0.6, 0.3)}
        />
      </Plane>
      
      {/* Additional ground details */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 6 + Math.random() * 3;
        return (
          <Plane
            key={`ground-detail-${i}`}
            position={[
              Math.cos(angle) * radius,
              -0.05,
              Math.sin(angle) * radius
            ]}
            rotation={[-Math.PI / 2, 0, angle]}
            args={[2 + Math.random(), 2 + Math.random()]}
          >
            <meshLambertMaterial 
              color={new THREE.Color(
                0.3 + Math.random() * 0.2,
                0.5 + Math.random() * 0.2,
                0.2 + Math.random() * 0.1
              )}
              transparent
              opacity={0.7}
            />
          </Plane>
        );
      })}

      {/* Main tree */}
      <CelShadedTree 
        position={[0, 0, 0]} 
        scale={1}
        lightDirection={new THREE.Vector3(1, 1, 0.5).normalize()}
      />
      
      {/* Secondary smaller trees */}
      <CelShadedTree 
        position={[-8, 0, -6]} 
        scale={0.7}
        lightDirection={new THREE.Vector3(1, 1, 0.5).normalize()}
      />
      
      <CelShadedTree 
        position={[7, 0, -8]} 
        scale={0.6}
        lightDirection={new THREE.Vector3(1, 1, 0.5).normalize()}
      />
      
      <CelShadedTree 
        position={[-5, 0, 9]} 
        scale={0.5}
        lightDirection={new THREE.Vector3(1, 1, 0.5).normalize()}
      />

      {/* Butterfly particles */}
      <ButterflyParticles 
        count={currentSettings.butterflies}
        bounds={10}
        colors={[
          new THREE.Color(1.0, 0.6, 0.2), // Orange
          new THREE.Color(0.8, 0.2, 0.8), // Magenta
          new THREE.Color(0.2, 0.8, 0.6), // Cyan
          new THREE.Color(1.0, 0.8, 0.3), // Yellow
          new THREE.Color(0.6, 0.3, 0.9), // Purple
        ]}
      />

      {/* Fog and lighting system */}
      <FogAndLighting
        lightPosition={[8, 12, 6]}
        fogDensity={currentSettings.fogDensity}
        godRaysIntensity={currentSettings.godRaysIntensity}
      />

      {/* Additional atmospheric elements */}
      {performanceMode === 'high' && (
        <>
          {/* Floating light orbs */}
          {[...Array(5)].map((_, i) => (
            <mesh
              key={`light-orb-${i}`}
              position={[
                (Math.random() - 0.5) * 16,
                2 + Math.random() * 4,
                (Math.random() - 0.5) * 16
              ]}
            >
              <sphereGeometry args={[0.1, 8, 6]} />
              <meshBasicMaterial
                color={new THREE.Color(1.0, 0.9, 0.7)}
                transparent
                opacity={0.6}
              />
            </mesh>
          ))}
        </>
      )}

      {/* Environment setup */}
      <Environment preset="dawn" />
      
      {/* Cel-shaded style fog */}
      <fog 
        attach="fog" 
        args={[new THREE.Color(0.8, 0.9, 1.0), 15, 35]} 
      />
    </group>
  );
}

export function CelShadedScene({
  className = "",
  enableControls = true,
  autoRotate = false,
  performanceMode = 'high',
}: CelShadedSceneProps) {
  const [dpr, setDpr] = React.useState(1.5);
  const [currentPerformanceMode, setCurrentPerformanceMode] = React.useState(performanceMode);

  // Camera settings
  const cameraProps = {
    position: [12, 8, 12] as [number, number, number],
    fov: 50,
    near: 0.1,
    far: 100,
  };

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={cameraProps}
        dpr={dpr}
        performance={{ min: 0.5 }}
        gl={{
          antialias: currentPerformanceMode === 'high',
          alpha: true,
          powerPreference: "high-performance",
        }}
        shadows={currentPerformanceMode !== 'low'}
      >
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        
        <PerformanceMonitor
          onIncline={(api) => {
            // Performance is good, increase quality
            if (currentPerformanceMode === 'low') {
              setCurrentPerformanceMode('medium');
            } else if (currentPerformanceMode === 'medium') {
              setCurrentPerformanceMode('high');
            }
            setDpr(1.5);
          }}
          onDecline={(api) => {
            // Performance is bad, decrease quality
            if (currentPerformanceMode === 'high') {
              setCurrentPerformanceMode('medium');
            } else if (currentPerformanceMode === 'medium') {
              setCurrentPerformanceMode('low');
            }
            setDpr(0.8);
          }}
        />

        <Suspense fallback={null}>
          <SceneContent performanceMode={currentPerformanceMode} />
        </Suspense>

        {/* Post-processing effects for cel-shading enhancement */}
        {currentPerformanceMode === 'high' && (
          <EffectComposer multisampling={8}>
            <Selection>
              <Outline 
                blur 
                visibleEdgeColor={new THREE.Color('black')}
                hiddenEdgeColor={new THREE.Color('black')}
                edgeStrength={3}
                width={1000}
                height={1000}
              />
            </Selection>
          </EffectComposer>
        )}

        {enableControls && (
          <OrbitControls
            autoRotate={autoRotate}
            autoRotateSpeed={0.5}
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            minDistance={8}
            maxDistance={25}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.2}
            target={[0, 3, 0]}
          />
        )}
      </Canvas>
      <Loader />
    </div>
  );
}