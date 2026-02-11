import { useMemo } from "react";
import * as THREE from "three";
import { TerrainSampler } from "../utils/terrainSampler";
import { Coordinate } from "../utils/Coordinate";

interface NorthArrowProps {
  terrainSampler: TerrainSampler;
  /** Position in world coordinates (default: top-right corner) */
  position?: { x: number; y: number };
  /** Size of the arrow in game units (default: 0.3) */
  size?: number;
}

export function NorthArrow({
  terrainSampler,
  position,
  size = 0.3,
}: NorthArrowProps) {
  // Default position: top-right corner of the map (high X, high Y in world coords)
  const arrowPosition = useMemo(() => {
    const pos = position || { x: 9, y: 9 }; // Near top-right corner
    const coordinate = Coordinate.fromWorldCoords(pos.x, pos.y);
    const point = terrainSampler.getClosestMapPoint(coordinate);
    
    if (!point) {
      // Fallback to a safe position
      return new THREE.Vector3(9, 0.5, 9);
    }
    
    // Position slightly above terrain
    return new THREE.Vector3(point.threeX, point.threeY + size * 0.5, point.threeZ);
  }, [position, terrainSampler, size]);

  // Arrow geometry pointing in negative Z direction (world north / into screen)
  const arrowGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    
    // Draw arrow pointing up (in 2D shape), then we'll rotate it
    const w = size * 0.3; // Half width of arrow base
    const h = size; // Arrow length
    const headW = size * 0.5; // Half width of arrow head
    const headH = size * 0.4; // Arrow head length
    const shaftH = h - headH; // Shaft length
    
    // Start at bottom center
    shape.moveTo(0, 0);
    // Bottom left of shaft
    shape.lineTo(-w, 0);
    // Top left of shaft
    shape.lineTo(-w, shaftH);
    // Bottom left of head
    shape.lineTo(-headW, shaftH);
    // Tip of arrow (pointing in +Y in 2D shape coords)
    shape.lineTo(0, h);
    // Bottom right of head
    shape.lineTo(headW, shaftH);
    // Top right of shaft
    shape.lineTo(w, shaftH);
    // Bottom right of shaft
    shape.lineTo(w, 0);
    // Close shape
    shape.lineTo(0, 0);
    
    const extrudeSettings = {
      depth: size * 0.05,
      bevelEnabled: true,
      bevelThickness: size * 0.02,
      bevelSize: size * 0.01,
      bevelSegments: 2,
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Center the geometry
    geometry.center();
    
    // Rotate so arrow points in negative Z direction (world north)
    // In 2D shape: Y is up, but in Three.js we want negative Z to be "north"
    geometry.rotateX(-Math.PI / 2);
    
    return geometry;
  }, [size]);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#ff0000",
      roughness: 0.4,
      metalness: 0.1,
    });
  }, []);

  return (
    <mesh
      position={arrowPosition}
      geometry={arrowGeometry}
      material={material}
      castShadow
    />
  );
}
