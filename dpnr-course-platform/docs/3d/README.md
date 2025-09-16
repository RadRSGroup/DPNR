# 3D Framework Understanding (R3F + Drei)

This summarizes the PRD’s 3D requirements and how we’ve implemented them.

## Constraints (from PRD)
- Use React Three Fiber (`@react-three/fiber`) and Drei only.
- Only on the landing page hero; no other pages use 3D.
- Total 3D assets <= 2MB (we currently use procedural primitives, no assets).
- Provide a 2D/mobile fallback; keep mobile light.
- Accessibility: no blocking animations; degrade gracefully.

## PRD Implementations Referenced
- Frontend Developer section (EXACT):
  - Canvas + `Float` + `MeshDistortMaterial` on a sphere.
  - Minimal lighting; camera at `[0,0,5]`.
- 3D Specialist section (COMPLETE):
  - Text + `OrbitControls` with zoom disabled, Suspense wrapper.

Note: PRD contains two slightly different “exact” examples. We chose the sphere + `MeshDistortMaterial` version to keep it light and asset‑free. We can switch to the text version if desired.

## Current Implementation
- File: `apps/web/components/Hero3D.tsx`
  - Client component (`'use client'`).
  - `<Canvas camera={{ position: [0,0,5] }}>`.
  - `<ambientLight intensity={0.5} />`.
  - `<Float speed={2} rotationIntensity={0.5}>` → `<mesh><sphereGeometry /><MeshDistortMaterial /></mesh>`.
- Landing page wiring:
  - File: `apps/web/app/page.tsx`
  - Renders a 2D fallback on small screens and shows `<Hero3D />` only on `md+`.

## Responsiveness & Fallbacks
- Mobile (default): simple 2D hero block; no Canvas mounted.
- Desktop (md+): 3D Canvas mounted.
- Optional future: respect `prefers-reduced-motion` to render static geometry/material.

## Performance Notes
- No external GLTF/texture assets → near‑zero asset weight.
- Sphere with 32x32 subdivisions is modest; adjust if perf dips on low‑end devices.
- Keep postprocessing off unless required.

## Testing & QA Plan
- Visual check on md+ vs. mobile breakpoints.
- Verify no layout shift around hero mount/unmount.
- Ensure no console errors in dev and production build.

## Open Decisions
- Choose between mesh‑distort sphere vs. text+controls hero (PRD shows both). Default is sphere.
- If we adopt text version, confirm font delivery under 2MB cap and cache policy.

