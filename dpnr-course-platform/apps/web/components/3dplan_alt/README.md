# Cel-Shaded 3D Tree Scene

A beautiful cel-shaded 3D scene inspired by treephoto.jpeg featuring a majestic tree with floating butterflies, atmospheric fog, and god rays.

## Features

- **Cel-shading (Toon Shading)**: Custom shader materials with 3-4 color bands for non-photorealistic rendering
- **Bold Outlines**: Outline materials for stylized geometry edges
- **Animated Butterflies**: Floating particles with cel-shaded wings and flutter animation
- **Volumetric Fog**: Multi-layered atmospheric fog effects
- **God Rays**: Light shafts streaming through the tree canopy
- **Performance Adaptive**: Automatically adjusts quality based on device performance
- **Mobile Responsive**: Optimized for both desktop (60 FPS) and mobile (30 FPS)

## Components

### Core Components
- `CelShadedScene.tsx` - Main scene orchestrator with performance monitoring
- `CelShadedTree.tsx` - Detailed tree with trunk, branches, and leaf clusters
- `ButterflyParticles.tsx` - Animated butterfly swarm system
- `FogAndLighting.tsx` - Atmospheric effects and lighting setup
- `CelShaderMaterials.tsx` - Custom shader materials for cel-shading

### Materials
- `CelTreeMaterial` - Cel-shaded leaves with color variation
- `CelTrunkMaterial` - Bark texture with quantized lighting  
- `CelButterflyMaterial` - Iridescent butterfly wings
- `OutlineMaterial` - Bold black outlines for stylized look

## Usage

```tsx
import { CelShadedScene } from './components/3dplan_alt';

function MyComponent() {
  return (
    <div className="w-full h-screen">
      <CelShadedScene 
        enableControls={true}
        autoRotate={false}
        performanceMode="high"
        className="w-full h-full"
      />
    </div>
  );
}
```

## Demo

Visit `/demo-celshaded` to see the scene in action.

## Performance Modes

- **High**: 15 butterflies, full effects, shadows, antialiasing
- **Medium**: 10 butterflies, reduced effects, shadows, no antialiasing  
- **Low**: 6 butterflies, minimal effects, no shadows, no antialiasing

The scene automatically adapts performance based on framerate using `PerformanceMonitor`.

## Controls

- **Drag**: Rotate camera around the scene
- **Scroll**: Zoom in/out
- **Auto-rotate**: Optional automatic camera rotation

## Visual Style

The scene uses a warm color palette inspired by animated films like Zelda: Breath of the Wild:
- Greens and golds for foliage
- Warm browns for wood
- Soft blues for atmosphere
- Vibrant butterfly colors (orange, magenta, cyan, yellow, purple)

## Technical Details

- Built with React Three Fiber and Three.js
- Custom GLSL shaders for cel-shading effects
- Post-processing with outline enhancement
- Adaptive quality system for optimal performance
- Mobile-friendly responsive design