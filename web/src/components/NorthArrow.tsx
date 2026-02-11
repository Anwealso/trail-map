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
  // Default position: right side at world Y = 0 (world Z axis = 0)
  const arrowPosition = useMemo(() => {
    const pos = position || { x: 9, y: 0 }; // Right side at world Y = 0
    const coordinate = Coordinate.fromWorldCoords(pos.x, pos.y);
    const point = terrainSampler.getClosestMapPoint(coordinate);

    if (!point) {
      // Fallback to a safe position
      return new THREE.Vector3(9, size * 0.5, 0);
    }

    // Position at terrain height + half size offset
    return new THREE.Vector3(point.threeX, point.threeY + size * 0.5, point.threeZ);
  }, [position, terrainSampler, size]);

  // Arrow geometry - pure triangle pointing in negative Z direction (world north)
  const arrowGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    
    // Pure triangle: base at bottom, tip at top
    const halfWidth = size * 0.5; // Half width of triangle base
    const height = size; // Triangle height
    
    // Triangle pointing up in 2D shape coords
    shape.moveTo(0, height); // Tip at top
    shape.lineTo(-halfWidth, 0); // Bottom left
    shape.lineTo(halfWidth, 0); // Bottom right
    shape.lineTo(0, height); // Back to tip
    
    const extrudeSettings = {
      depth: 0.1,
      bevelEnabled: false,
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
