import { useEffect, useState, useMemo } from "react";
import * as THREE from "three";
import { TerrainSampler } from "../utils/terrainSampler";
import { Point } from "../utils/Point";
import { createYarnMaterial } from "../materials/yarnMaterial";

const TRAIL_HEIGHT_OFFSET = 0.05; // Slightly higher than flat trail to avoid z-fighting and sit on top

/**
 * Load in trail csv coordinates. Trail points must be provided in world units.
 */
async function loadTrailCSV(url: string): Promise<{ x: number; y: number }[]> {
  const response = await fetch(url);
  const text = await response.text();
  const lines = text.trim().split("\n");

  return lines.slice(1).map((line) => {
    const [x, y] = line.split(",").map(Number);
    return { x, y };
  });
}

interface StringTrailProps {
  csvUrl: string;
  radius?: number; // Tube radius
  terrainSampler: TerrainSampler;
  color?: string;
  onLoad?: () => void;
}

export function StringTrail({
  csvUrl,
  radius = 0.05,
  terrainSampler,
  color = "#ffeb3b",
  onLoad,
}: StringTrailProps) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [endpoints, setEndpoints] = useState<[THREE.Vector3, THREE.Vector3] | null>(null);

  useEffect(() => {
    loadTrailCSV(csvUrl).then((data) => {
      const trailCoordsVect3: THREE.Vector3[] = [];

      data.forEach(({ x, y }) => {
        const p = Point.fromWorldCoords(x, y, 0);
        // Sample actual height from terrain to drape the string
        const terrainP = terrainSampler.getClosestMapPoint(p);
        
        if (terrainP) {
           trailCoordsVect3.push(new THREE.Vector3(
             p.threeX, 
             terrainP.threeY + TRAIL_HEIGHT_OFFSET, 
             p.threeZ
           ));
        }
      });

      if (trailCoordsVect3.length < 2) return;

      const curve = new THREE.CatmullRomCurve3(trailCoordsVect3, false);
      // Tubular segments, Radius, Radial segments, Closed
      const tubeGeometry = new THREE.TubeGeometry(curve, trailCoordsVect3.length * 5, radius, 8, false);
      
      setEndpoints([trailCoordsVect3[0], trailCoordsVect3[trailCoordsVect3.length - 1]]);
      setGeometry(tubeGeometry);
      onLoad?.();
    });
  }, [csvUrl, terrainSampler, radius, onLoad]);

  const mat = useMemo(
    () => createYarnMaterial({ color }),
    [color],
  );

  const capGeometry = useMemo(() => new THREE.SphereGeometry(radius, 8, 8), [radius]);

  if (!geometry) return null;

  return (
    <group>
      <mesh geometry={geometry} material={mat} castShadow={false} receiveShadow />
      {endpoints && (
        <>
          <mesh position={endpoints[0]} geometry={capGeometry} material={mat} />
          <mesh position={endpoints[1]} geometry={capGeometry} material={mat} />
        </>
      )}
    </group>
  );
}
