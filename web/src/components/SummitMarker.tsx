import { useMemo } from "react";
import * as THREE from "three";
import { TerrainSampler } from "../utils/terrainSampler";
import { Point } from "../utils/Point";

interface SummitMarkerProps {
  terrainSampler: TerrainSampler;
  topologyId: string;
}

/**
 * A marker for the summit of a mountain.
 * For Mt Tibrogargan, it finds the highest point on the map and places a marker there.
 * GPS Location: -26.933°S, 152.950°E
 */
export function SummitMarker({ terrainSampler, topologyId }: SummitMarkerProps) {
  const summitPosition = useMemo(() => {
    // We only show this for the Tibrogargan map
    if (topologyId !== 'tibrogargan') return null;

    // Find the highest point within the visible circular terrain
    // The terrain is centered at (5, 5) with a radius of 5 in game units
    const centerX = 5;
    const centerZ = 5;
    const circleRadius = 5;

    let maxZ = -Infinity;
    let peak: Point | null = null;

    for (const row of terrainSampler.mapPoints) {
      for (const p of row) {
        // Calculate distance from center to check if it's within the visible circle
        const dx = p.threeX - centerX;
        const dz = p.threeZ - centerZ;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist <= circleRadius) {
          if (p.gameZ > maxZ) {
            maxZ = p.gameZ;
            peak = p;
          }
        }
      }
    }

    if (!peak) return null;

    // Return the Three.js position
    return new THREE.Vector3(peak.threeX, peak.threeY, peak.threeZ);
  }, [terrainSampler, topologyId]);

  if (!summitPosition) return null;

  return (
    <group position={summitPosition}>
      {/* Spherical marker as requested */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <sphereGeometry args={[0.06, 24, 24]} />
        <meshStandardMaterial 
          color="#FFD700" // Gold color
          emissive="#AA8800"
          emissiveIntensity={0.2}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      
      {/* Small glow/light effect */}
      <pointLight 
        color="#FFD700" 
        intensity={0.2} 
        distance={1} 
        position={[0, 0.1, 0]} 
      />
      
      {/* Optional: subtle shadow/base to ground the sphere */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.04, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}
