import { useMemo } from "react";
import * as THREE from "three";
import { TerrainSampler } from "../utils/terrainSampler";
import { Coordinate } from "../utils/Coordinate";

interface NorthArrowProps {
  terrainSampler: TerrainSampler;
  /** Position in world coordinates (default: top-right corner) */
  position?: { x: number; y: number };
  /** Size (length) of the arrow in game units (default: 0.3) */
  size?: number;
  /** Width multiplier for the arrow base (default: 1) */
  widthMultiplier?: number;
}

export function NorthArrow({
  terrainSampler,
  position,
  size = 0.3,
  widthMultiplier = 1,
}: NorthArrowProps) {
  // Calculate the minimum height of the terrain
  const minTerrainHeight = useMemo(() => {
    let minH = Infinity;
    for (const row of terrainSampler.mapPoints) {
      for (const p of row) {
        if (p.threeY < minH) minH = p.threeY;
      }
    }
    return minH === Infinity ? 0 : minH;
  }, [terrainSampler]);

  // Default position: centered at bottom edge of map
  const arrowPosition = useMemo(() => {
    const pos = position || { x: 5, y: 0 }; // Center horizontally at bottom edge
    const coordinate = Coordinate.fromWorldCoords(pos.x, pos.y);
    const point = terrainSampler.getClosestMapPoint(coordinate);

    if (!point) {
      // Fallback to bottom edge at minimum terrain height
      return new THREE.Vector3(5, minTerrainHeight + size * 0.5, 0);
    }

    // Position at the minimum terrain height (true bottom of the map)
    return new THREE.Vector3(point.threeX, minTerrainHeight + size * 0.5, point.threeZ);
  }, [position, terrainSampler, size, minTerrainHeight]);

  // Arrow geometry - pure triangle pointing in negative Z direction (world north)
  const arrowGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    
    // Pure triangle: base at bottom, tip at top
    const halfWidth = size * 0.5 * widthMultiplier; // Half width of triangle base (scaled by widthMultiplier)
    const height = size; // Triangle height (unchanged)
    
    // Triangle pointing up in 2D shape coords
    shape.moveTo(0, height); // Tip at top
    shape.lineTo(-halfWidth, 0); // Bottom left
    shape.lineTo(halfWidth, 0); // Bottom right
    shape.lineTo(0, height); // Back to tip
    
    const extrudeSettings = {
      depth: 0.01,
      bevelEnabled: false,
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Center the geometry
    geometry.center();
    
    // Rotate so arrow points in negative Z direction (world north)
    // In 2D shape: Y is up, but in Three.js we want negative Z to be "north"
    geometry.rotateX(-Math.PI / 2);
    
    return geometry;
  }, [size, widthMultiplier]);

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

export default NorthArrow;
