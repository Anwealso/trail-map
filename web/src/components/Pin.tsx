import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TerrainSampler } from "../utils/terrainSampler";
import { Point } from "../utils/Point";
import { Coordinate } from "../utils/Coordinate";
import { createClayMaterial } from "../materials/clayMaterial";

interface PinProps {
  x: number; // X coordinate in world coordinates
  y: number; // Y coordinate in world coordinates
  terrainSampler: TerrainSampler;
  color?: string;
  radius?: number;
  heading?: number; // Device heading in degrees (0-360)
}

export function Pin({
  x,
  y,
  terrainSampler,
  color = "#ff4444",
  radius = 0.15,
  heading = 0,
}: PinProps) {
  const [position, setPosition] = useState<THREE.Vector3 | null>(null);
  const height: number = useMemo(() => radius * 2, [radius]);

  // Calculate sphere radius that fits inside cone
  const coneAngle = Math.atan(radius / height);
  const sphereRadius = radius / Math.cos(coneAngle);
  const sphereOffset = height / 2 + sphereRadius * Math.sin(coneAngle);

  // Create the pin geometry (cone + sphere)
  const pinGeometry = useMemo(() => {
    const coneGeo = new THREE.ConeGeometry(radius, height, 32, 1, true);
    coneGeo.rotateX(Math.PI);

    const sphereGeo = new THREE.SphereGeometry(
      sphereRadius,
      32,
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

  // Create arrow geometry - flat triangle on top pointing up
  const arrowGeometry = useMemo(() => {
    const arrowSize = radius * 0.6;
    const arrowHalfWidth = arrowSize * 0.5;
    const arrowY = sphereOffset + sphereRadius + 0.01; // Just above top of sphere
    
    // Create a flat arrow using ConeGeometry pointing up
    const arrowGeo = new THREE.ConeGeometry(arrowHalfWidth, arrowSize, 3);
    // Rotate so it points up (Y axis) - default cone already points up
    // Just need to position it on top
    arrowGeo.translate(0, arrowY + arrowSize / 2, 0);
    
    return arrowGeo;
  }, [radius, sphereRadius, sphereOffset]);

  useEffect(() => {
    try {
      const coordinate = Coordinate.fromWorldCoords(x, y);
      const point: Point | null = terrainSampler.getClosestMapPoint(coordinate);
      if (!point) {
        console.error("Invalid pin position: requested pin location is off the map.");
        return;
      }
      setPosition(
        new THREE.Vector3(point.threeX, point.threeY + height / 2, point.threeZ),
      );
    } catch (error) {
      console.error("Error setting pin position:", error);
    }
  }, [x, y, terrainSampler, radius, height]);

  // Calculate rotation based on heading
  const rotationY = THREE.MathUtils.degToRad(-heading);

  const pinMaterial = useMemo(() => {
    return createClayMaterial({ color });
  }, [color]);

  const arrowMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.4,
      metalness: 0.1,
    });
  }, []);

  if (!position) return null;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={pinGeometry} material={pinMaterial} />
      <mesh geometry={arrowGeometry} material={arrowMaterial} />
    </group>
  );
}
