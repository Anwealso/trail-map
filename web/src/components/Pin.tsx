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

  // Create arrow texture
  const arrowTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;

    // Fill with base color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 256);

    // Draw white arrow at the top center
    // The top of the texture maps to the top of the sphere
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    // Arrow pointing up in texture (which is toward -Z in 3D)
    ctx.moveTo(256, 30); // Tip at top center
    ctx.lineTo(206, 120); // Bottom left
    ctx.lineTo(306, 120); // Bottom right
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [color]);

  // Create the pin geometry with proper UVs for the sphere
  const geometry = useMemo(() => {
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

    // The sphere UVs are set up so:
    // - u goes 0->1 around the equator (azimuthal)
    // - v goes 0->1 from bottom to top (polar)
    // We want the arrow at v=1 (top) and centered at u=0.5
    // The arrow texture is at the top of the canvas, so it maps to v near 1

    let merged = BufferGeometryUtils.mergeGeometries([coneGeo, sphereGeo]);
    merged = BufferGeometryUtils.mergeVertices(merged);
    merged.computeVertexNormals();
    return merged;
  }, [radius, height, sphereRadius, sphereOffset, coneAngle]);

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

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: arrowTexture,
      roughness: 0.4,
      metalness: 0.1,
    });
  }, [arrowTexture]);

  if (!position) return null;

  return (
    <mesh
      position={position}
      geometry={geometry}
      material={material}
      rotation={[0, rotationY, 0]}
    />
  );
}
