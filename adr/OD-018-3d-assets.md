# ADR-018: 3D Asset Specifications

## Status: PROPOSED

## Decision
**SVG/CSS 3D illustration at launch** (already implemented in `jeans-360-view.tsx`). True GLTF/GLB 3D viewer deferred to Phase 4+ with real turntable photography.

## Rationale
Doc 02 §11 requires 3D Product Viewer with Three.js/React Three Fiber, GLTF/GLB, progressive loading, quality levels. However:
- No 3D assets exist yet
- 3D models require professional garment photography/scanning
- CSS/SVG illustration satisfies "3D-style fit illustration" requirement for preview
- Real 360° viewing needs real turntable photos or garment model (Doc 01, README)

## Quality Levels (Future)
| Level | Description |
|-------|-------------|
| Low | CSS/SVG illustration (current) |
| Medium | GLTF/GLB with basic textures |
| High | Photorealistic 3D scan + turntable video |

## Fallback
- Always fall back to product photos if 3D fails to load
- Progressive loading for 3D assets

## Owner
Product + Engineering

## Target Date
Phase 0, Week 2 (spec only; implementation Phase 4+)