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

  // Create the pin geometry (cone + sphere) - no texture
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

  // Create arrow geometry - a simple flat triangle on top pointing forward (-Z)
  const arrowGeometry = useMemo(() => {
    const arrowSize = radius * 0.8;
    const arrowHalfWidth = arrowSize * 0.5;
    const arrowY = sphereOffset + sphereRadius; // On top of sphere

    // Create a flat triangle using BufferGeometry
    // Triangle pointing in -Z direction
    const vertices = new Float32Array([
      // Front face (visible)
      0,
      arrowY,
      -sphereRadius * 0.5 - arrowSize, // Tip (front)
      -arrowHalfWidth,
      arrowY,
      -sphereRadius * 0.5, // Bottom left (back)
      arrowHalfWidth,
      arrowY,
      -sphereRadius * 0.5, // Bottom right (back)

      // Back face
      0,
      arrowY - 0.01,
      -sphereRadius * 0.5 - arrowSize, // Tip
      arrowHalfWidth,
      arrowY - 0.01,
      -sphereRadius * 0.5, // Bottom right
      -arrowHalfWidth,
      arrowY - 0.01,
      -sphereRadius * 0.5, // Bottom left
    ]);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    geo.translate(0, 0, sphereRadius / 2);
    return geo;
  }, [radius, sphereRadius, sphereOffset]);

  useEffect(() => {
    try {
      const coordinate = Coordinate.fromWorldCoords(x, y);
      const point: Point | null = terrainSampler.getClosestMapPoint(coordinate);
      if (!point) {
        console.error(
          "Invalid pin position: requested pin location is off the map.",
        );
        return;
      }
      setPosition(
        new THREE.Vector3(
          point.threeX,
          point.threeY + height / 2,
          point.threeZ,
        ),
      );
    } catch (error) {
      console.error("Error setting pin position:", error);
    }
  }, [x, y, terrainSampler, radius, height]);

  // Calculate rotation based on heading
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
