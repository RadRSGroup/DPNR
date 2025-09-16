'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { TreeSprite } from '../../components/3dplan_alt/TreeSprite';

export default function TreeSpriteDemo() {
  return (
    <div className="w-full h-screen bg-gradient-to-b from-yellow-100 via-green-100 to-emerald-200">
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
        <h1 className="text-xl font-bold text-gray-800 mb-2">Tree Sprite (Billboard)</h1>
        <p className="text-sm text-gray-600 mb-2">
          Beautiful tree image that always faces the camera
        </p>
        <div className="text-xs text-gray-500">
          <p>• Move around - tree always faces you</p>
          <p>• Scroll to zoom</p>
          <p>• Gentle breathing animation</p>
        </div>
      </div>
      
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
      >
        <Suspense fallback={null}>
          {/* Warm lighting to match the tree photo */}
          <ambientLight intensity={0.9} />
          <directionalLight position={[2, 5, 2]} intensity={0.3} />
          
          {/* The tree sprite - always faces camera */}
          <TreeSprite position={[0, 0, 0]} scale={1.2} />
          
          {/* Maybe add some other trees in the background */}
          <TreeSprite position={[-8, -1, -3]} scale={0.7} />
          <TreeSprite position={[6, -0.5, -4]} scale={0.8} />
          <TreeSprite position={[0, -2, -8]} scale={0.5} />
          
          {/* Camera controls */}
          <OrbitControls 
            enableDamping
            dampingFactor={0.05}
            minDistance={5}
            maxDistance={25}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}