import { useEffect, useState } from "react";
import * as THREE from "three";
import { Point } from "../utils/Point";
import {
  TOPOMAP_GAME_SIZE_LIMIT_X,
  TOPOMAP_GAME_SIZE_LIMIT_Y,
  WORLD_TO_GAME_HEIGHT_SCALE_RATIO,
} from "../utils/constants";

interface TerrainProps {
  mapPoints: Point[][];
  material?: THREE.Material;
}

/**
 * Creates a Three.js PlaneGeometry from heightmap image data using TerrainHeightSampler.
 * The geometry is sized to match the game world dimensions (1x1 game units) and uses
 * GAMEWORLD_RESOLUTION to determine the mesh density.
 *
 * @param mapPoints - The final map mesh point matrix
 * @returns A Three.js PlaneGeometry with heights sampled from the terrain heightmap
 */
export function createHeightmapGeometry(
  mapPoints: Point[][],
): THREE.BufferGeometry {
  // The mesh resolution matches the resampled matrix
  const segmentsX = mapPoints[0].length - 1;
  const segmentsZ = mapPoints.length - 1;

  // Create the plane geometry with the calculated resolution
  const geometry = new THREE.PlaneGeometry(
    TOPOMAP_GAME_SIZE_LIMIT_X,
    TOPOMAP_GAME_SIZE_LIMIT_Y,
    segmentsX,
    segmentsZ,
  );
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;

  // Map the resampled points directly to mesh vertices
  for (let iy = 0; iy < segmentsZ + 1; iy++) {
    for (let ix = 0; ix < segmentsX + 1; ix++) {
      const i = iy * (segmentsX + 1) + ix;
      const point = mapPoints[iy][ix];
      positions.setY(i, point.worldZ * WORLD_TO_GAME_HEIGHT_SCALE_RATIO);
    }
  }

  geometry.computeVertexNormals();
  return geometry;
}

export function Terrain({ mapPoints, material }: TerrainProps) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const mat =
    material ??
    new THREE.MeshStandardMaterial({
      color: 0xb0e67e,
      wireframe: false,
      // wireframe: true,
      flatShading: false,
      side: THREE.DoubleSide,
    });

  useEffect(() => {
    setGeometry(createHeightmapGeometry(mapPoints));
  }, [mapPoints]);

  if (!geometry) return null;

  return <mesh geometry={geometry} material={mat} />;
}
