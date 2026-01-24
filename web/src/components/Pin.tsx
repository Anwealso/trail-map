import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
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

export function Pin({
  x,
  y,
  terrainSampler,
  color = "#d83d28",
  radius = 0.1, // radius in game units
}: PinProps) {
  const [position, setPosition] = useState<THREE.Vector3 | null>(null);
  const height: number = useMemo(() => radius * 2, [radius]);

  // Calculate sphere radius that fits inside cone
  const coneAngle = Math.atan(radius / height);
  const sphereRadius = radius / Math.cos(coneAngle);
  const sphereOffset = height / 2 + sphereRadius * Math.sin(coneAngle);

  const combinedGeometry = useMemo(() => {
    const coneGeo = new THREE.ConeGeometry(radius, height, 16, 1, true);
    coneGeo.rotateX(Math.PI);

    const sphereGeo = new THREE.SphereGeometry(
      sphereRadius,
      16,
      16,
      0,
      2 * Math.PI,
      0,
      Math.PI / 2 + coneAngle,
    );
    sphereGeo.translate(0, sphereOffset, 0);

    let merged = BufferGeometryUtils.mergeGeometries([coneGeo, sphereGeo]);
    merged = BufferGeometryUtils.mergeVertices(merged);
    merged.computeVertexNormals();
    return merged;
  }, [radius, height, sphereRadius, sphereOffset, coneAngle]);

  useEffect(() => {
    // Create a coordinate from game coordinates and sample the height
    const coordinate = Coordinate.fromWorldCoords(x, y);

    // Create a Point with the sampled height (Point z is vertical height)
    const point: Point | null = terrainSampler.getClosestMapPoint(coordinate);
    if (!point) {
      throw new Error(
        "Invalid pin position: requested pin location is off the map.",
      );
    }
    setPosition(
      new THREE.Vector3(point.threeX, point.threeY + height / 2, point.threeZ),
    );
  }, [x, y, terrainSampler, radius, height]);

  const mat = useMemo(() => createClayMaterial({ color }), [color]);

  if (!position) return null;

  return (
    <mesh
      position={position}
      geometry={combinedGeometry}
      material={mat}
      castShadow
    />
  );
}
