'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, ScrollControls, useScroll, Scroll, shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';

// Advanced depth extraction shader for complex forest scene
const ForestStreamDepthMaterial = shaderMaterial(
  {
    streamTexture: null,
    time: 0,
    scrollProgress: 0,
    resolution: new THREE.Vector2(1024, 1024),
  },
  // Vertex shader with multi-layered displacement
  `
    uniform sampler2D streamTexture;
    uniform float time;
    uniform vec2 resolution;
    
    varying vec2 vUv;
    varying float vDepth;
    varying vec3 vWorldPosition;
    varying float vBrightness;
    
    float smootherstep(float edge0, float edge1, float x) {
      x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
      return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
    }
    
    // Multi-sample anti-aliasing
    vec4 textureAA(sampler2D tex, vec2 uv) {
      vec2 texelSize = 1.0 / resolution;
      vec4 color = texture2D(tex, uv);
      color += texture2D(tex, uv + vec2(texelSize.x, 0.0));
      color += texture2D(tex, uv + vec2(-texelSize.x, 0.0));
      color += texture2D(tex, uv + vec2(0.0, texelSize.y));
      color += texture2D(tex, uv + vec2(0.0, -texelSize.y));
      color += texture2D(tex, uv + texelSize);
      color += texture2D(tex, uv - texelSize);
      color += texture2D(tex, uv + vec2(texelSize.x, -texelSize.y));
      color += texture2D(tex, uv + vec2(-texelSize.x, texelSize.y));
      return color / 9.0;
    }
    
    void main() {
      vUv = uv;
      
      vec4 texColor = textureAA(streamTexture, uv);
      float brightness = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
      vBrightness = brightness;
      
      float displacement = 0.0;
      
      // Water areas (brightest parts) - pushed back with ripples
      if (brightness > 0.6) {
        float waterDepth = (brightness - 0.6) / 0.4;
        displacement = -waterDepth * 8.0;
        
        // Add water ripples
        float ripple1 = sin(uv.x * 20.0 + time * 2.0) * 0.3;
        float ripple2 = cos(uv.y * 15.0 + time * 1.5) * 0.2;
        displacement += (ripple1 + ripple2) * waterDepth * 0.5;
      }
      // Exposed roots and fallen logs (mid-dark brown tones)
      else if (brightness > 0.35 && brightness < 0.55) {
        // Detect root areas (bottom 60% of image with brown tones)
        if (uv.y < 0.6) {
          float rootFactor = (0.55 - brightness) / 0.2;
          
          // Create cylindrical root structure
          float distFromHorizontalCenter = abs(uv.y - 0.3) * 3.0;
          float rootRadius = smootherstep(1.0, 0.0, distFromHorizontalCenter);
          
          // Individual root segments
          float rootPattern = sin(uv.x * 25.0) * cos(uv.y * 30.0);
          rootRadius *= (1.0 + rootPattern * 0.3);
          
          displacement = rootFactor * rootRadius * 12.0;
          
          // Add organic variation
          displacement += sin(uv.x * 40.0 + uv.y * 35.0) * 0.5;
        }
      }
      // Tree trunk (dark vertical areas)
      else if (brightness < 0.4) {
        // Main trunk detection (upper center area)
        if (uv.x > 0.3 && uv.x < 0.7 && uv.y > 0.4) {
          float trunkFactor = (0.4 - brightness) / 0.4;
          
          // Cylindrical trunk shape
          float distFromCenter = abs(uv.x - 0.5) * 2.0;
          float cylindrical = smootherstep(1.0, 0.0, distFromCenter);
          cylindrical = mix(cylindrical, 1.0, 0.2);
          
          displacement = trunkFactor * cylindrical * 15.0;
          
          // Bark texture
          float barkTexture = sin(uv.y * 50.0) * cos(uv.x * 30.0) * 0.3;
          displacement += barkTexture * trunkFactor;
        }
        // Other dark areas (rocks, shadows)
        else {
          float rockFactor = (0.4 - brightness) / 0.4;
          displacement = rockFactor * 6.0;
        }
      }
      // Stone bridge and rocks (gray tones)
      else if (brightness > 0.4 && brightness < 0.6) {
        // Upper area stone bridge
        if (uv.y > 0.2 && uv.y < 0.4) {
          float stoneFactor = (0.6 - brightness) / 0.2;
          displacement = stoneFactor * 8.0;
          
          // Stone block pattern
          float stonePattern = step(0.5, sin(uv.x * 15.0)) * step(0.5, sin(uv.y * 20.0));
          displacement += stonePattern * 2.0;
        }
        // Scattered rocks
        else {
          float rockFactor = (0.6 - brightness) / 0.2;
          displacement = rockFactor * 4.0;
        }
      }
      // Foliage (green areas)
      else {
        float foliageFactor = smootherstep(0.5, 0.8, brightness);
        displacement = foliageFactor * 2.0;
        
        // Leaf movement
        displacement += sin(uv.x * 10.0 + time * 0.5) * cos(uv.y * 8.0 + time * 0.3) * 0.3;
      }
      
      vDepth = displacement;
      
      vec3 newPosition = position;
      newPosition.z += displacement;
      
      // Organic movement for natural elements
      if (brightness < 0.6) { // Non-water areas
        float moveIntensity = (0.6 - brightness) * 0.03;
        newPosition.x += sin(position.y * 2.0 + time * 0.4) * moveIntensity;
        newPosition.y += cos(position.x * 1.5 + time * 0.6) * moveIntensity * 0.5;
      }
      
      vWorldPosition = (modelMatrix * vec4(newPosition, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,
  // Fragment shader with realistic lighting
  `
    uniform sampler2D streamTexture;
    uniform float time;
    uniform float scrollProgress;
    uniform vec2 resolution;
    
    varying vec2 vUv;
    varying float vDepth;
    varying vec3 vWorldPosition;
    varying float vBrightness;
    
    vec4 textureAA(sampler2D tex, vec2 uv) {
      vec2 texelSize = 1.0 / resolution;
      vec4 color = texture2D(tex, uv);
      color += texture2D(tex, uv + vec2(texelSize.x, 0.0));
      color += texture2D(tex, uv + vec2(-texelSize.x, 0.0));
      color += texture2D(tex, uv + vec2(0.0, texelSize.y));
      color += texture2D(tex, uv + vec2(0.0, -texelSize.y));
      color += texture2D(tex, uv + texelSize);
      color += texture2D(tex, uv - texelSize);
      color += texture2D(tex, uv + vec2(texelSize.x, -texelSize.y));
      color += texture2D(tex, uv + vec2(-texelSize.x, texelSize.y));
      return color / 9.0;
    }
    
    float smootherstep(float edge0, float edge1, float x) {
      x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
      return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
    }
    
    void main() {
      vec4 color = textureAA(streamTexture, vUv);
      
      // Water reflections and movement
      if (vBrightness > 0.6) {
        // Animated water surface
        float waterTime = time * 0.8;
        float reflection1 = sin(vUv.x * 30.0 + waterTime) * 0.1;
        float reflection2 = cos(vUv.y * 25.0 + waterTime * 1.2) * 0.08;
        
        color.rgb += vec3(reflection1 + reflection2) * 0.3;
        
        // Water color enhancement
        color.rgb = mix(color.rgb, vec3(0.6, 0.75, 0.8), 0.2);
      }
      
      // Root and trunk cylindrical shading
      if (vBrightness < 0.55 && vBrightness > 0.35 && vUv.y < 0.6) {
        // Root shading
        float distFromCenter = abs(vUv.y - 0.3) * 3.0;
        float cylindricalShading = mix(0.6, 1.0, smootherstep(1.0, 0.0, distFromCenter));
        color.rgb *= cylindricalShading;
        
        // Root rim lighting
        float rimLight = pow(distFromCenter, 1.2) * 0.25;
        color.rgb += vec3(0.2, 0.15, 0.1) * rimLight;
      }
      
      // Tree trunk cylindrical shading
      if (vBrightness < 0.4 && vUv.x > 0.3 && vUv.x < 0.7 && vUv.y > 0.4) {
        float distFromCenter = abs(vUv.x - 0.5) * 2.0;
        float cylindricalShading = mix(0.5, 1.0, smootherstep(1.0, 0.0, distFromCenter));
        color.rgb *= cylindricalShading;
        
        // Bark highlights
        float barkHighlight = pow(distFromCenter, 1.5) * 0.3;
        color.rgb += vec3(0.15, 0.12, 0.08) * barkHighlight;
      }
      
      // Enhanced depth lighting
      float depthShading = 1.0 + vDepth * 0.06;
      color.rgb *= depthShading;
      
      // Atmospheric perspective
      if (vDepth < -3.0) {
        float fogAmount = smootherstep(-3.0, -8.0, vDepth);
        vec3 forestFog = mix(vec3(0.7, 0.8, 0.75), vec3(0.5, 0.6, 0.55), fogAmount * 0.5);
        color.rgb = mix(color.rgb, forestFog, fogAmount * 0.7);
      }
      
      // Enhanced contrast and color
      color.rgb = pow(color.rgb, vec3(0.9));
      
      // Subtle green forest tint
      color.rgb = mix(color.rgb, color.rgb * vec3(0.95, 1.02, 0.98), 0.1);
      
      gl_FragColor = vec4(color.rgb, color.a);
    }
  `
);

extend({ ForestStreamDepthMaterial });

function ForestStream3D() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const scroll = useScroll();
  const texture = useTexture('/forest-stream.jpg');
  
  // High-quality texture configuration
  useMemo(() => {
    if (texture) {
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.flipY = false;
    }
  }, [texture]);
  
  // Ultra-high resolution for detailed displacement
  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(16, 20, 640, 800);
  }, []);
  
  const material = useMemo(() => {
    return new ForestStreamDepthMaterial({
      streamTexture: texture,
      time: 0,
      scrollProgress: 0,
      resolution: new THREE.Vector2(1200, 1500),
    });
  }, [texture]);

  useFrame((state) => {
    if (meshRef.current && material) {
      material.uniforms.time.value = state.clock.getElapsedTime();
      material.uniforms.scrollProgress.value = scroll.offset;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[0, 0, 0]}>
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// Atmospheric forest layers
function ForestAtmosphere() {
  const texture = useTexture('/forest-stream.jpg');
  const scroll = useScroll();
  const groupRef = useRef<THREE.Group>(null);
  
  useMemo(() => {
    if (texture) {
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
    }
  }, [texture]);
  
  useFrame(() => {
    if (groupRef.current) {
      const progress = scroll.offset;
      
      groupRef.current.children.forEach((child, i) => {
        const speed = 1 - (i * 0.15);
        child.position.x = Math.sin(progress * Math.PI * 0.3) * speed * 1.2;
        child.position.y = -progress * speed * 0.4;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* Deep forest background */}
      <mesh position={[0, 0, -15]}>
        <planeGeometry args={[28, 35]} />
        <meshBasicMaterial 
          map={texture} 
          transparent 
          opacity={0.08}
          color="#2d4a2d"
        />
      </mesh>
      
      {/* Mid-forest mist */}
      <mesh position={[0, 0, -8]}>
        <planeGeometry args={[24, 30]} />
        <meshBasicMaterial 
          map={texture} 
          transparent 
          opacity={0.05}
          color="#4a6b4a"
        />
      </mesh>
    </group>
  );
}

// Forest particles (leaves, insects, water droplets)
function ForestParticles({ count = 40 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 12
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.015,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01
      ),
      phase: Math.random() * Math.PI * 2,
      scale: 0.02 + Math.random() * 0.08,
      type: Math.floor(Math.random() * 3), // 0: leaf, 1: insect, 2: droplet
    }));
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    particles.forEach((particle, i) => {
      // Different movement patterns by type
      if (particle.type === 0) { // Falling leaves
        particle.position.y -= 0.008;
        particle.position.x += Math.sin(time + particle.phase) * 0.005;
      } else if (particle.type === 1) { // Flying insects
        particle.position.x += Math.sin(time * 0.7 + particle.phase) * 0.012;
        particle.position.y += Math.cos(time * 0.5 + particle.phase) * 0.008;
        particle.position.z += Math.sin(time * 0.6 + particle.phase) * 0.006;
      } else { // Water droplets
        particle.position.y -= 0.02;
        particle.position.x += Math.sin(time * 2 + particle.phase) * 0.002;
      }
      
      // Reset particles that go out of bounds
      if (particle.position.y < -12) particle.position.y = 12;
      if (Math.abs(particle.position.x) > 10) particle.position.x *= -0.8;
      if (Math.abs(particle.position.z) > 8) particle.position.z *= -0.8;
      
      particle.position.add(particle.velocity);
      
      const matrix = new THREE.Matrix4();
      matrix.makeRotationFromEuler(new THREE.Euler(
        time + particle.phase,
        time * 0.5 + particle.phase,
        time * 0.3 + particle.phase
      ));
      matrix.setPosition(particle.position);
      matrix.scale(new THREE.Vector3(particle.scale, particle.scale, particle.scale));
      
      meshRef.current.setMatrixAt(i, matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.5, 0.1, 0.02]} />
      <meshPhongMaterial 
        color="#8db88d" 
        transparent 
        opacity={0.6} 
        emissive="#4a7a4a"
        emissiveIntensity={0.1}
      />
    </instancedMesh>
  );
}

// Dynamic camera for forest exploration
function ForestCamera() {
  const { camera } = useThree();
  const scroll = useScroll();
  
  const waypoints = [
    { pos: [0, 2, 25], target: [0, 0, 0] },      // Wide forest view
    { pos: [8, -4, 18], target: [2, -6, 0] },    // Focus on roots
    { pos: [-6, 2, 15], target: [-2, 0, 0] },    // Tree trunk detail
    { pos: [4, 6, 20], target: [0, 4, 0] },      // Stone bridge
    { pos: [0, -8, 12], target: [0, -5, 0] },    // Stream close-up
    { pos: [0, 12, 22], target: [0, 8, 0] },     // Canopy view
  ];
  
  useFrame(() => {
    const progress = Math.max(0, Math.min(1, scroll.offset)) * (waypoints.length - 1);
    const index = Math.floor(progress);
    const nextIndex = Math.min(index + 1, waypoints.length - 1);
    const t = progress - index;
    
    // Smooth camera easing
    const ease = t * t * t * (t * (t * 6 - 15) + 10);
    
    const from = waypoints[index];
    const to = waypoints[nextIndex];
    
    if (from && to) {
      camera.position.lerpVectors(
        new THREE.Vector3(...from.pos),
        new THREE.Vector3(...to.pos),
        ease
      );
      
      const target = new THREE.Vector3().lerpVectors(
        new THREE.Vector3(...from.target),
        new THREE.Vector3(...to.target),
        ease
      );
      
      camera.lookAt(target);
    }
  });
  
  return null;
}

export default function ForestStream3DScene() {
  return (
    <div className="w-full h-screen bg-gradient-to-b from-green-900/20 via-green-800/10 to-green-700/5">
      <Canvas 
        camera={{ position: [0, 2, 25], fov: 50, near: 0.1, far: 100 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance",
          stencil: false,
        }}
        dpr={[1, 2]}
      >
        {/* Forest lighting setup */}
        <ambientLight intensity={0.4} color="#f5f8f5" />
        <directionalLight 
          position={[20, 25, 15]} 
          intensity={1.2} 
          color="#fff8dc"
          castShadow 
        />
        <pointLight 
          position={[-15, -10, -8]} 
          intensity={0.6} 
          color="#e6f3e6" 
        />
        <spotLight
          position={[10, 15, 12]}
          intensity={0.8}
          color="#f0fff0"
          angle={0.4}
          penumbra={0.6}
        />
        <pointLight 
          position={[5, -8, 8]} 
          intensity={0.4} 
          color="#add8e6" 
        />
        
        <ScrollControls pages={6} damping={0.08}>
          <ForestCamera />
          <ForestAtmosphere />
          <ForestStream3D />
          <ForestParticles count={35} />
          
          <Scroll html>
            <div className="w-full h-[600vh]">
              <div className="sticky top-0 w-screen h-screen flex items-center justify-center pointer-events-none">
                <div className="max-w-4xl mx-auto p-8">
                  <div className="bg-black/5 backdrop-blur-3xl p-12 rounded-[2.5rem] shadow-2xl border border-white/15 text-center">
                    <h1 className="text-6xl font-extralight text-green-900 mb-8 tracking-wider">
                      Forest Stream
                    </h1>
                    <p className="text-2xl text-green-800 mb-6 font-light">
                      Where ancient roots meet flowing waters
                    </p>
                    <p className="text-green-700 text-lg opacity-90 mb-8">
                      Scroll to explore the hidden depths of nature's sanctuary
                    </p>
                    
                    <div className="flex justify-center items-center space-x-6">
                      <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
                      <div className="w-1 h-8 bg-green-500/30 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse delay-300"></div>
                      <div className="w-1 h-8 bg-green-400/30 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse delay-700"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Scroll>
        </ScrollControls>
        
        <fog attach="fog" args={['#e8f4e8', 30, 80]} />
      </Canvas>
    </div>
  );
}