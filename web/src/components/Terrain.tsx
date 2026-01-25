import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Point } from "../utils/Point";
import {
  TOPOMAP_GAME_SIZE_LIMIT_X,
  TOPOMAP_GAME_SIZE_LIMIT_Y,
} from "../utils/constants";

import { createClayMaterial } from "../utils/clayMaterial";

const FADE_FRACTION: number = 0.2;

interface TerrainProps {
  mapPoints: Point[][];
  material?: THREE.Material;
  fadeFraction?: number;
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
  fadeFraction: number = 0.2,
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

  // Map the resampled points directly to mesh vertices (threeX, threeY, threeZ = game coords in Three.js axes)
  const radius =
    Math.min(TOPOMAP_GAME_SIZE_LIMIT_X, TOPOMAP_GAME_SIZE_LIMIT_Y) / 2;
  const centerX = TOPOMAP_GAME_SIZE_LIMIT_X / 2;
  const centerZ = TOPOMAP_GAME_SIZE_LIMIT_Y / 2;
  const inCircle: boolean[] = [];
  const vertexCount = (segmentsX + 1) * (segmentsZ + 1);
  const fadeArray = new Float32Array(vertexCount);
  const fadeWidth = radius * fadeFraction; // wide fade over outer percentage of the circle

  for (let iy = 0; iy < segmentsZ + 1; iy++) {
    for (let ix = 0; ix < segmentsX + 1; ix++) {
      const i = iy * (segmentsX + 1) + ix;
      const point = mapPoints[iy][ix];
      let x = point.threeX;
      let z = point.threeZ;
      const dx = x - centerX;
      const dz = z - centerZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      inCircle[i] = dist <= radius;
      if (dist > radius && dist > 1e-6) {
        const scale = radius / dist;
        x = centerX + dx * scale;
        z = centerZ + dz * scale;
      }
      positions.setX(i, x);
      positions.setY(i, point.threeY);
      positions.setZ(i, z);

      // Fade: 1 at center, 0 at edge. Smoothstep over the outer fadeWidth.
      const distForFade = Math.sqrt((x - centerX) ** 2 + (z - centerZ) ** 2);
      const t =
        fadeWidth > 1e-6 ? (distForFade - (radius - fadeWidth)) / fadeWidth : 0;
      const smoothstep = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
      fadeArray[i] = 1 - smoothstep;
    }
  }

  geometry.setAttribute("fade", new THREE.BufferAttribute(fadeArray, 1));

  // Find height range for texturing
  let minH = Infinity;
  let maxH = -Infinity;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    if (y < minH) minH = y;
    if (y > maxH) maxH = y;
  }
  const heightRange = new Float32Array(2);
  heightRange[0] = minH;
  heightRange[1] = maxH;
  geometry.userData.heightRange = { min: minH, max: maxH };

  // Remove triangles that are fully outside the circle
  const index = geometry.getIndex();
  if (index) {
    const newIndices: number[] = [];
    const arr = index.array;
    for (let i = 0; i < arr.length; i += 3) {
      const i0 = arr[i];
      const i1 = arr[i + 1];
      const i2 = arr[i + 2];
      if (inCircle[i0] || inCircle[i1] || inCircle[i2]) {
        newIndices.push(i0, i1, i2);
      }
    }
    geometry.setIndex(newIndices);
  }

  geometry.computeVertexNormals();
  return geometry;
}

function addTerrainShader(mat: THREE.Material) {
  mat.userData.uHeightRange = { value: new THREE.Vector2(0, 1) };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uHeightRange = mat.userData.uHeightRange;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      "#include <common>\nattribute float fade;\nvarying float vFade;\nvarying float vTerrainHeight;",
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvFade = fade;\nvTerrainHeight = position.y;",
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      "#include <common>\nvarying float vFade;\nvarying float vTerrainHeight;\nuniform vec2 uHeightRange;",
    );

    const colorLogic = `
      float h = (vTerrainHeight - uHeightRange.x) / max(0.0001, uHeightRange.y - uHeightRange.x);
      h = clamp(h, 0.0, 1.0);
      
      vec3 snowColor = vec3(1.0, 1.0, 1.0);
      vec3 riverColor = vec3(0.2, 0.45, 0.85); // Slightly more saturated blue, less pale
      
      float snowMask = smoothstep(0.7, 0.8, h);
      float riverMask = 1.0 - smoothstep(0.098, 0.102, h); // Dramatically reduced edge blur
      
      diffuseColor.rgb = mix(diffuseColor.rgb, snowColor, snowMask);
      diffuseColor.rgb = mix(diffuseColor.rgb, riverColor, riverMask);
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      "#include <color_fragment>\n" + colorLogic,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      "diffuseColor.a *= vFade;\n#include <opaque_fragment>",
    );
  };
}

export function Terrain({ mapPoints, material }: TerrainProps) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [defaultMat] = useState(() => {
    const m = createClayMaterial({ color: "#b0e67e" });
    addTerrainShader(m);
    return m;
  });
  const mat = material ?? defaultMat;

  useEffect(() => {
    const geom = createHeightmapGeometry(mapPoints, FADE_FRACTION);
    setGeometry(geom);
    if (mat.userData.uHeightRange) {
      mat.userData.uHeightRange.value.set(
        geom.userData.heightRange.min,
        geom.userData.heightRange.max,
      );
      mat.needsUpdate = true;
    }
  }, [mapPoints, mat]);

  const undersideMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.BackSide,
        toneMapped: false, // match scene background: skip tone mapping so white stays (1,1,1)
      }),
    [],
  );

  if (!geometry) return null;

  return (
    <group>
      <mesh geometry={geometry} material={mat} receiveShadow />
      <mesh geometry={geometry} material={undersideMat} />
    </group>
  );
}
