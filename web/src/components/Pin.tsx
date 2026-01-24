import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { TerrainSampler } from "../utils/terrainSampler";
import { Point } from "../utils/Point";
import { Coordinate } from "../utils/Coordinate";
import { createClayMaterial } from "../utils/clayMaterial";

interface PinProps {
  x: number; // X coordinate in world coordinates
  y: number; // Y coordinate in world coordinates
  terrainSampler: TerrainSampler;
  color?: string;
  radius?: number;
}

// TODO: check through this to see that it is actualy using world coordinates properly here
export function Pin({
  x,
  y,
  terrainSampler,
  color = "#d83d28",
  radius = 0.1, // radius in game units
}: PinProps) {
  const [position, setPosition] = useState<THREE.Vector3 | null>(null);
  const height: number = useMemo(
    () => radius * 2,
    [radius]);

  useEffect(() => {
    // Create a coordinate from game coordinates and sample the height
    const coordinate = Coordinate.fromWorldCoords(x, y);

    // Create a Point with the sampled height (Point z is vertical height)
    const point = terrainSampler.getClosestMapPoint(coordinate);
    if (!point) {
      throw new Error(
        "Invalid pin position: requested pin location is off the map.",
      );
    }
    setPosition(
      new THREE.Vector3(point.threeX, point.threeY + height / 2, point.threeZ),
    );
  }, [x, y, terrainSampler, radius]);

  // Calculate sphere radius that fits inside cone
  const coneAngle = Math.atan(radius / height);
  const sphereRadius = radius / Math.cos(coneAngle);
  const sphereOffset = height / 2 + sphereRadius * Math.sin(coneAngle);

  const mat = useMemo(() => createClayMaterial({ color }), [color]);

  if (!position) return null;

  return (
    <group position={position}>
      {/* Cone pin */}
      <mesh rotation={[Math.PI, 0, 0]} material={mat}>
        <coneGeometry args={[radius, height, 16]} />
      </mesh>
      {/* Sphere that fits inside cone */}
      <mesh position={[0, sphereOffset, 0]} material={mat}>
        <sphereGeometry
          args={[sphereRadius, 16, 16, 0, 2 * Math.PI, 0, Math.PI - coneAngle]}
        />
      </mesh>
    </group>
  );
}
