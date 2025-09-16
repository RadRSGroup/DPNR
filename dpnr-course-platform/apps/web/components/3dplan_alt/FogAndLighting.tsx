import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sphere, Plane, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';

// Volumetric fog material
const VolumetricFogMaterial = shaderMaterial(
  {
    time: 0,
    lightPosition: new THREE.Vector3(5, 8, 5),
    fogColor: new THREE.Color(0.8, 0.9, 1.0),
    density: 0.1,
    lightIntensity: 1.0,
  },
  // Vertex shader
  `
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float time;
    uniform vec3 lightPosition;
    uniform vec3 fogColor;
    uniform float density;
    uniform float lightIntensity;
    
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    
    // Simple noise function
    float noise(vec3 pos) {
      return sin(pos.x * 0.5) * sin(pos.y * 0.3) * sin(pos.z * 0.4) * 0.5 + 0.5;
    }
    
    void main() {
      vec3 lightDir = normalize(lightPosition - vWorldPosition);
      float lightDistance = length(lightPosition - vWorldPosition);
      
      // Fog density based on distance and noise
      float fogNoise = noise(vWorldPosition + vec3(time * 0.1, 0.0, time * 0.05));
      float fogDensity = density * (1.0 + fogNoise * 0.3);
      
      // Light scattering
      float scattering = max(0.0, dot(vNormal, lightDir));
      scattering = pow(scattering, 2.0);
      
      // Distance fade
      float distanceFade = 1.0 / (1.0 + lightDistance * 0.1);
      
      // Final color
      vec3 finalColor = fogColor * lightIntensity * scattering * distanceFade;
      float alpha = fogDensity * scattering * distanceFade * 0.8;
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
);

// God rays material
const GodRaysMaterial = shaderMaterial(
  {
    time: 0,
    lightPosition: new THREE.Vector3(5, 8, 5),
    rayColor: new THREE.Color(1.0, 0.9, 0.7),
    intensity: 0.5,
    cameraPosition: new THREE.Vector3(0, 0, 0),
  },
  // Vertex shader
  `
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float time;
    uniform vec3 lightPosition;
    uniform vec3 rayColor;
    uniform float intensity;
    uniform vec3 cameraPosition;
    
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    
    float noise(vec2 pos) {
      return sin(pos.x * 3.0) * sin(pos.y * 2.0) * 0.5 + 0.5;
    }
    
    void main() {
      vec3 rayDir = normalize(vWorldPosition - cameraPosition);
      vec3 lightDir = normalize(lightPosition - cameraPosition);
      
      // Ray alignment with light direction
      float alignment = max(0.0, dot(rayDir, lightDir));
      alignment = pow(alignment, 8.0);
      
      // Animated rays
      float rayPattern = sin(vUv.y * 20.0 + time * 2.0) * 0.5 + 0.5;
      rayPattern *= sin(vUv.x * 5.0 + time) * 0.5 + 0.5;
      
      // Noise for organic feel
      float noisePattern = noise(vUv * 10.0 + vec2(time * 0.1, 0.0));
      
      float finalIntensity = alignment * rayPattern * noisePattern * intensity;
      
      gl_FragColor = vec4(rayColor * finalIntensity, finalIntensity * 0.6);
    }
  `
);

extend({ VolumetricFogMaterial, GodRaysMaterial });

interface FogAndLightingProps {
  lightPosition?: [number, number, number];
  fogDensity?: number;
  godRaysIntensity?: number;
}

export function FogAndLighting({
  lightPosition = [5, 8, 5],
  fogDensity = 0.1,
  godRaysIntensity = 0.5,
}: FogAndLightingProps) {
  const { camera } = useThree();
  const fogRef = useRef<THREE.Mesh[]>([]);
  const godRaysRef = useRef<THREE.Mesh[]>([]);
  
  // Fog volumes at different layers
  const fogVolumes = useMemo(() => [
    { position: [0, 2, 0], scale: [8, 3, 8], opacity: 0.3 },
    { position: [2, 4, -2], scale: [6, 2, 6], opacity: 0.2 },
    { position: [-3, 1.5, 3], scale: [5, 2.5, 5], opacity: 0.25 },
    { position: [1, 3.5, 1], scale: [7, 2, 7], opacity: 0.15 },
  ], []);
  
  // God ray planes
  const godRayPlanes = useMemo(() => [
    { position: [3, 6, 2], rotation: [0.3, 0.5, 0], scale: [2, 8, 1] },
    { position: [1, 7, -1], rotation: [0.2, -0.3, 0.1], scale: [1.5, 6, 1] },
    { position: [-2, 5, 3], rotation: [-0.1, 0.8, 0.2], scale: [1.8, 7, 1] },
    { position: [4, 4, -3], rotation: [0.4, -0.6, -0.1], scale: [1.2, 5, 1] },
  ], []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Update fog materials
    fogRef.current.forEach((mesh, i) => {
      if (mesh && mesh.material && 'uniforms' in mesh.material) {
        const material = mesh.material as THREE.ShaderMaterial;
        if (material.uniforms) {
          material.uniforms.time.value = time + i * 0.5;
          material.uniforms.lightPosition.value.set(...lightPosition);
        }
      }
    });
    
    // Update god rays materials
    godRaysRef.current.forEach((mesh, i) => {
      if (mesh && mesh.material && 'uniforms' in mesh.material) {
        const material = mesh.material as THREE.ShaderMaterial;
        if (material.uniforms) {
          material.uniforms.time.value = time + i * 0.3;
          material.uniforms.lightPosition.value.set(...lightPosition);
          material.uniforms.cameraPosition.value.copy(camera.position);
        }
      }
    });
  });

  return (
    <group>
      {/* Main directional light */}
      <directionalLight
        position={lightPosition}
        intensity={1.2}
        color={new THREE.Color(1.0, 0.95, 0.8)}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      
      {/* Ambient light */}
      <ambientLight intensity={0.3} color={new THREE.Color(0.7, 0.8, 1.0)} />
      
      {/* Additional warm fill light */}
      <pointLight
        position={[-5, 3, 5]}
        intensity={0.5}
        color={new THREE.Color(1.0, 0.7, 0.5)}
        distance={15}
        decay={2}
      />

      {/* Volumetric fog volumes */}
      {fogVolumes.map((volume, i) => (
        <Sphere
          key={`fog-${i}`}
          ref={(el) => {
            if (el) fogRef.current[i] = el;
          }}
          position={volume.position as [number, number, number]}
          args={[1, 16, 12]}
          scale={volume.scale as [number, number, number]}
        >
          <volumetricFogMaterial
            transparent
            time={0}
            lightPosition={new THREE.Vector3(...lightPosition)}
            fogColor={new THREE.Color(0.8, 0.9, 1.0)}
            density={fogDensity * volume.opacity}
            lightIntensity={1.0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </Sphere>
      ))}

      {/* God rays */}
      {godRayPlanes.map((plane, i) => (
        <Plane
          key={`godray-${i}`}
          ref={(el) => {
            if (el) godRaysRef.current[i] = el;
          }}
          position={plane.position as [number, number, number]}
          rotation={plane.rotation as [number, number, number]}
          args={plane.scale.slice(0, 2) as [number, number]}
        >
          <godRaysMaterial
            transparent
            time={0}
            lightPosition={new THREE.Vector3(...lightPosition)}
            rayColor={new THREE.Color(1.0, 0.9, 0.7)}
            intensity={godRaysIntensity}
            cameraPosition={camera.position}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </Plane>
      ))}

      {/* Ground fog */}
      <Plane
        position={[0, 0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        args={[16, 16]}
      >
        <volumetricFogMaterial
          transparent
          time={0}
          lightPosition={new THREE.Vector3(...lightPosition)}
          fogColor={new THREE.Color(0.9, 0.95, 1.0)}
          density={fogDensity * 0.2}
          lightIntensity={0.8}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </Plane>
      
      {/* Light source visualization */}
      <Sphere position={lightPosition} args={[0.3, 8, 6]}>
        <meshBasicMaterial
          color={new THREE.Color(1.0, 0.95, 0.8)}
          transparent
          opacity={0.8}
        />
      </Sphere>
    </group>
  );
}

// Type declarations for custom materials
declare global {
  namespace JSX {
    interface IntrinsicElements {
      volumetricFogMaterial: any;
      godRaysMaterial: any;
    }
  }
}