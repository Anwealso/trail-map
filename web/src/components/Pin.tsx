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

  // Create arrow texture - draws on top portion of sphere only
  const arrowTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;

    // Fill entire canvas with base color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 512);

    // Draw white arrow in the top portion only (maps to top of sphere)
    // In UV space: v=0 is bottom, v=1 is top
    // In canvas: y=0 is top, y=512 is bottom
    // Top 20% of canvas maps to top cap of sphere
    const arrowSize = 80;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    // Arrow pointing up (toward top of texture = top of sphere)
    ctx.moveTo(256, 60); // Tip
    ctx.lineTo(196, 160); // Bottom left
    ctx.lineTo(316, 160); // Bottom right
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    // Prevent texture wrapping which causes the arrow to appear at bottom too
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, [color]);

  // Create the pin geometry with UVs that map top of texture to top of sphere
  const geometry = useMemo(() => {
    const coneGeo = new THREE.ConeGeometry(radius, height, 32, 1, true);
    coneGeo.rotateX(Math.PI);

    // Create sphere with UVs that map the top of the texture to the top of the sphere
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

    // Modify UVs for sphere - only use top portion of texture
    const uvAttribute = sphereGeo.attributes.uv;
    for (let i = 0; i < uvAttribute.count; i++) {
      const v = uvAttribute.getY(i);
      // Original v goes from 0 (cutoff) to 1 (top pole)
      // Remap so top 30% of texture covers the visible sphere
      // v=1 (top) stays at v=0, v=0 (bottom cutoff) goes to v=0.3
      const newV = 0.3 * (1 - v);
      uvAttribute.setY(i, newV);
    }
    uvAttribute.needsUpdate = true;

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
