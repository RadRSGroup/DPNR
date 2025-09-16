'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, ScrollControls, useScroll, Scroll, shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';

// Enhanced depth extraction shader with anti-aliasing and smoothing
const SmoothDepthTreeMaterial = shaderMaterial(
  {
    treeTexture: null,
    time: 0,
    scrollProgress: 0,
    resolution: new THREE.Vector2(1024, 1024),
  },
  // Vertex shader with smoother displacement
  `
    uniform sampler2D treeTexture;
    uniform float time;
    uniform vec2 resolution;
    
    varying vec2 vUv;
    varying float vDepth;
    varying vec3 vWorldPosition;
    
    // Smooth step function for better transitions
    float smootherstep(float edge0, float edge1, float x) {
      x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
      return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
    }
    
    // Sample texture with anti-aliasing
    vec4 textureAA(sampler2D tex, vec2 uv) {
      vec2 texelSize = 1.0 / resolution;
      vec4 color = texture2D(tex, uv);
      color += texture2D(tex, uv + vec2(texelSize.x, 0.0));
      color += texture2D(tex, uv + vec2(0.0, texelSize.y));
      color += texture2D(tex, uv + texelSize);
      return color * 0.25;
    }
    
    void main() {
      vUv = uv;
      
      // Anti-aliased texture sampling
      vec4 texColor = textureAA(treeTexture, uv);
      float brightness = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
      
      float displacement = 0.0;
      
      // Smoother transitions between different parts
      if (brightness < 0.5) {
        // Trunk area with cylindrical effect (bottom 65%)
        if (uv.y < 0.65) {
          float distFromCenter = abs(uv.x - 0.5) * 2.0;
          
          // Smoother cylindrical curve with falloff
          float cylindricalFactor = smootherstep(1.0, 0.0, distFromCenter);
          cylindricalFactor = mix(cylindricalFactor, 1.0, 0.3); // Prevent complete flattening at edges
          
          // Gradient-based displacement for smoother transitions
          float depthFactor = smootherstep(0.5, 0.2, brightness);
          displacement = depthFactor * 12.0 * cylindricalFactor;
          
          // Add vertical variation for natural trunk texture
          float verticalVariation = sin(uv.y * 8.0) * 0.2;
          displacement += verticalVariation * depthFactor;
        } 
        // Branches with smoother transition
        else {
          float depthFactor = smootherstep(0.5, 0.3, brightness);
          displacement = depthFactor * 6.0;
        }
      }
      // Leaves with softer displacement
      else if (brightness < 0.75) {
        float leafFactor = smootherstep(0.75, 0.5, brightness);
        displacement = leafFactor * 2.5;
      }
      // Background with subtle depth
      else {
        float bgFactor = smootherstep(0.75, 0.9, brightness);
        displacement = -bgFactor * 3.0;
      }
      
      vDepth = displacement;
      
      vec3 newPosition = position;
      newPosition.z += displacement;
      
      // Gentler organic movement
      float waveIntensity = (1.0 - brightness) * 0.05;
      newPosition.x += sin(position.y * 1.5 + time * 0.3) * waveIntensity;
      newPosition.y += cos(position.x * 1.2 + time * 0.4) * waveIntensity * 0.5;
      
      vWorldPosition = (modelMatrix * vec4(newPosition, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,
  // Fragment shader with enhanced lighting and smoothing
  `
    uniform sampler2D treeTexture;
    uniform float time;
    uniform float scrollProgress;
    uniform vec2 resolution;
    
    varying vec2 vUv;
    varying float vDepth;
    varying vec3 vWorldPosition;
    
    // Anti-aliased texture sampling
    vec4 textureAA(sampler2D tex, vec2 uv) {
      vec2 texelSize = 1.0 / resolution;
      vec4 color = texture2D(tex, uv);
      color += texture2D(tex, uv + vec2(texelSize.x, 0.0));
      color += texture2D(tex, uv + vec2(0.0, texelSize.y));
      color += texture2D(tex, uv + texelSize);
      return color * 0.25;
    }
    
    float smootherstep(float edge0, float edge1, float x) {
      x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
      return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
    }
    
    void main() {
      vec4 color = textureAA(treeTexture, vUv);
      float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      
      // Enhanced trunk shading with smoother transitions
      if (brightness < 0.5 && vUv.y < 0.65) {
        float distFromCenter = abs(vUv.x - 0.5) * 2.0;
        
        // Smoother cylindrical shading
        float cylindricalShading = mix(0.7, 1.0, smootherstep(1.0, 0.0, distFromCenter));
        color.rgb *= cylindricalShading;
        
        // Enhanced rim lighting for better depth perception
        float rimIntensity = pow(distFromCenter, 1.5);
        vec3 rimColor = mix(vec3(0.1, 0.08, 0.05), vec3(0.3, 0.25, 0.2), rimIntensity);
        color.rgb += rimColor * 0.2;
        
        // Subsurface scattering simulation for organic look
        float sss = (1.0 - distFromCenter) * 0.1;
        color.rgb += vec3(0.1, 0.15, 0.05) * sss;
      }
      
      // Improved depth-based lighting
      float depthShading = 1.0 + vDepth * 0.08;
      color.rgb *= depthShading;
      
      // Enhanced atmospheric perspective
      float distance = length(vWorldPosition);
      if (vDepth < -1.5) {
        float fogAmount = smootherstep(-1.5, -4.0, vDepth);
        vec3 fogColor = mix(vec3(0.85, 0.92, 0.85), vec3(0.7, 0.8, 0.75), fogAmount);
        color.rgb = mix(color.rgb, fogColor, fogAmount * 0.6);
      }
      
      // Subtle color correction for more natural look
      color.rgb = mix(color.rgb, color.rgb * color.rgb, 0.1);
      
      // Gentle contrast enhancement
      color.rgb = pow(color.rgb, vec3(0.95));
      
      gl_FragColor = vec4(color.rgb, color.a);
    }
  `
);

extend({ SmoothDepthTreeMaterial });

function SmoothDeepTree() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const scroll = useScroll();
  const texture = useTexture('/tree-source.png');
  
  // Configure texture for better quality
  useMemo(() => {
    if (texture) {
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    }
  }, [texture]);
  
  // Higher resolution geometry for smoother displacement
  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(15, 15, 512, 512);
  }, []);
  
  const material = useMemo(() => {
    return new SmoothDepthTreeMaterial({
      treeTexture: texture,
      time: 0,
      scrollProgress: 0,
      resolution: new THREE.Vector2(1024, 1024),
    });
  }, [texture]);

  useFrame((state) => {
    if (meshRef.current && material) {
      material.uniforms.time.value = state.clock.getElapsedTime();
      material.uniforms.scrollProgress.value = scroll.offset;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// Enhanced parallax layers with better blending
function EnhancedParallaxLayers() {
  const texture = useTexture('/tree-source.png');
  const scroll = useScroll();
  const groupRef = useRef<THREE.Group>(null);
  
  // Configure texture
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
        const speed = 1 - (i * 0.2);
        child.position.x = Math.sin(progress * Math.PI * 0.5) * speed * 1.5;
        child.position.y = -progress * speed * 0.3;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* Distant atmospheric layer */}
      <mesh position={[0, 0, -12]}>
        <planeGeometry args={[25, 25]} />
        <meshBasicMaterial 
          map={texture} 
          transparent 
          opacity={0.12}
          color="#e8f4e8"
          blending={THREE.NormalBlending}
        />
      </mesh>
      
      {/* Mid-ground mist */}
      <mesh position={[0, 0, -6]}>
        <planeGeometry args={[22, 22]} />
        <meshBasicMaterial 
          map={texture} 
          transparent 
          opacity={0.08}
          color="#f0f8f0"
          blending={THREE.NormalBlending}
        />
      </mesh>
    </group>
  );
}

// Smoother butterflies with better animation
function SmoothButterflies3D({ count = 25 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const butterflies = useMemo(() => {
    return Array.from({ length: count }, () => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 8
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.015,
        (Math.random() - 0.5) * 0.015
      ),
      phase: Math.random() * Math.PI * 2,
      scale: 0.03 + Math.random() * 0.1,
      wingPhase: Math.random() * Math.PI * 2,
    }));
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    butterflies.forEach((butterfly, i) => {
      // Smoother flight patterns
      butterfly.position.x += Math.sin(time * 0.5 + butterfly.phase) * 0.015;
      butterfly.position.y += Math.cos(time * 0.3 + butterfly.phase) * 0.01;
      butterfly.position.z += Math.sin(time * 0.4 + butterfly.phase) * 0.008;
      
      // Gentle boundary constraints
      ['x', 'y', 'z'].forEach(axis => {
        const bounds = axis === 'z' ? 6 : 8;
        if (Math.abs(butterfly.position[axis as keyof THREE.Vector3]) > bounds) {
          butterfly.velocity[axis as keyof THREE.Vector3] *= -0.8;
          butterfly.position[axis as keyof THREE.Vector3] = Math.sign(butterfly.position[axis as keyof THREE.Vector3]) * bounds * 0.9;
        }
      });
      
      butterfly.position.add(butterfly.velocity);
      
      // Smoother rotation with wing flutter
      const wingFlutter = Math.sin(time * 8 + butterfly.wingPhase) * 0.2;
      const matrix = new THREE.Matrix4();
      matrix.makeRotationY(time * 2 + butterfly.phase + wingFlutter);
      matrix.makeRotationX(Math.sin(time * 1.5 + butterfly.phase) * 0.3);
      matrix.setPosition(butterfly.position);
      matrix.scale(new THREE.Vector3(butterfly.scale, butterfly.scale, butterfly.scale));
      
      meshRef.current!.setMatrixAt(i, matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <planeGeometry args={[1, 0.6]} />
      <meshPhongMaterial 
        color="#fffacd" 
        transparent 
        opacity={0.85} 
        side={THREE.DoubleSide}
        emissive="#fff8dc"
        emissiveIntensity={0.15}
      />
    </instancedMesh>
  );
}

// Smoother camera movement
function SmoothScrollCamera() {
  const { camera } = useThree();
  const scroll = useScroll();
  
  const waypoints = [
    { pos: [0, 0, 22], target: [0, 0, 0] },
    { pos: [10, -6, 14], target: [0, -2, 0] },
    { pos: [-8, 0, 12], target: [0, 0, 0] },
    { pos: [6, 6, 14], target: [0, 3, 0] },
    { pos: [0, 10, 18], target: [0, 4, 0] },
  ];
  
  useFrame(() => {
    const progress = Math.max(0, Math.min(1, scroll.offset)) * (waypoints.length - 1);
    const index = Math.floor(progress);
    const nextIndex = Math.min(index + 1, waypoints.length - 1);
    const t = progress - index;
    
    // Smooth interpolation using easing
    const easeInOut = t * t * (3.0 - 2.0 * t);
    
    const from = waypoints[index];
    const to = waypoints[nextIndex];
    
    if (from && to) {
      camera.position.lerpVectors(
        new THREE.Vector3(...from.pos),
        new THREE.Vector3(...to.pos),
        easeInOut
      );
      
      const target = new THREE.Vector3().lerpVectors(
        new THREE.Vector3(...from.target),
        new THREE.Vector3(...to.target),
        easeInOut
      );
      
      camera.lookAt(target);
    }
  });
  
  return null;
}

export default function SmoothTreeScene() {
  return (
    <div className="w-full h-screen bg-gradient-to-b from-green-50 to-emerald-100">
      <Canvas 
        camera={{ position: [0, 0, 22], fov: 45, near: 0.1, far: 100 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance",
          stencil: false,
        }}
        dpr={[1, 2]}
      >
        {/* Enhanced lighting setup */}
        <ambientLight intensity={0.6} color="#f0f8f0" />
        <directionalLight 
          position={[15, 15, 10]} 
          intensity={0.8} 
          color="#fff8dc"
          castShadow 
        />
        <pointLight 
          position={[-12, -8, -5]} 
          intensity={0.4} 
          color="#e6f3e6" 
        />
        <spotLight
          position={[8, 12, 8]}
          intensity={0.3}
          color="#f5fffa"
          angle={0.3}
          penumbra={0.5}
        />
        
        <ScrollControls pages={5} damping={0.1}>
          <SmoothScrollCamera />
          <EnhancedParallaxLayers />
          <SmoothDeepTree />
          <SmoothButterflies3D count={20} />
          
          <Scroll html>
            <div className="w-full h-[500vh]">
              <div className="sticky top-0 w-screen h-screen flex items-center justify-center pointer-events-none">
                <div className="max-w-3xl mx-auto p-8">
                  <div className="bg-white/10 backdrop-blur-3xl p-10 rounded-[2rem] shadow-2xl border border-white/20 text-center transform transition-all duration-1000">
                    <h1 className="text-5xl font-light text-emerald-900 mb-6 tracking-wide">
                      Ancient Tree
                    </h1>
                    <p className="text-xl text-emerald-800 mb-4 font-light">
                      Explore the depths of nature's majesty
                    </p>
                    <p className="text-emerald-700 text-lg opacity-80">
                      Scroll to journey through roots, trunk, and canopy
                    </p>
                    
                    <div className="mt-8 flex justify-center space-x-4">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse delay-75"></div>
                      <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse delay-150"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Scroll>
        </ScrollControls>
        
        <fog attach="fog" args={['#e8f4e8', 25, 60]} />
      </Canvas>
    </div>
  );
}