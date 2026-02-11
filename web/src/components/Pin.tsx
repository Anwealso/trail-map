import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TerrainSampler } from "../utils/terrainSampler";
import { Point } from "../utils/Point";
import { Coordinate } from "../utils/Coordinate";

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
  color = "#d83d28",
  radius = 0.1, // radius in game units
  heading = 0,
}: PinProps) {
  const [position, setPosition] = useState<THREE.Vector3 | null>(null);
  const height: number = useMemo(() => radius * 2, [radius]);

  // Calculate sphere radius that fits inside cone
  const coneAngle = Math.atan(radius / height);
  const sphereRadius = radius / Math.cos(coneAngle);
  const sphereOffset = height / 2 + sphereRadius * Math.sin(coneAngle);

  // Create the main pin geometry (cone + sphere)
  const pinGeometry = useMemo(() => {
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

  // Create white arrow geometry separately
  const arrowGeometry = useMemo(() => {
    const arrowSize = radius * 1.2;
    const arrowHalfWidth = arrowSize * 0.4;
    const arrowThickness = radius * 0.15;
    const arrowY = sphereOffset + sphereRadius * 0.3;
    
    // Create a simple flat arrow triangle using ConeGeometry (pointing up)
    const arrowGeo = new THREE.ConeGeometry(arrowHalfWidth, arrowSize, 3);
    arrowGeo.rotateX(Math.PI); // Point down (toward -Y)
    arrowGeo.rotateY(Math.PI); // Rotate to align with -Z
    arrowGeo.scale(1, 0.3, 1); // Flatten it
    arrowGeo.translate(0, arrowY + arrowSize * 0.15, -arrowSize * 0.3); // Position on top
    
    return arrowGeo;
  }, [radius, sphereRadius, sphereOffset]);

  useEffect(() => {
    try {
      // Create a coordinate from game coordinates and sample the height
      const coordinate = Coordinate.fromWorldCoords(x, y);

      // Create a Point with the sampled height (Point z is vertical height)
      const point: Point | null = terrainSampler.getClosestMapPoint(coordinate);
      if (!point) {
        console.error(
          "Invalid pin position: requested pin location is off the map.",
        );
        return;
      }
      setPosition(
        new THREE.Vector3(point.threeX, point.threeY + height / 2, point.threeZ),
      );
    } catch (error) {
      console.error("Error setting pin position:", error);
    }
  }, [x, y, terrainSampler, radius, height]);

  // Calculate rotation based on heading (degrees to radians)
  // heading 0 = North, rotate around Y axis
  // In Three.js, rotation is counter-clockwise, so we negate heading
  const rotationY = THREE.MathUtils.degToRad(-heading);

  const pinMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.4,
      metalness: 0.1,
    });
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
