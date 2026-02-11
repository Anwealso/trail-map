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
  radius = 0.15, // radius in game units
  heading = 0,
}: PinProps) {
  const [position, setPosition] = useState<THREE.Vector3 | null>(null);
  const height: number = useMemo(() => radius * 2, [radius]);

  // Calculate sphere radius that fits inside cone
  const coneAngle = Math.atan(radius / height);
  const sphereRadius = radius / Math.cos(coneAngle);
  const sphereOffset = height / 2 + sphereRadius * Math.sin(coneAngle);

  // Create texture with white arrow on top
  const arrowTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;

    // Fill with base color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 512);

    // Draw white arrow at the top of the texture
    // Canvas y=0 is top, y=512 is bottom
    // UV v=0 is bottom, v=1 is top
    // So top of canvas (y small) = top of sphere (v large)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    // Triangle pointing up
    const centerX = 256;
    const tipY = 60;
    const baseY = 180;
    const halfWidth = 70;
    ctx.moveTo(centerX, tipY);              // Tip at top
    ctx.lineTo(centerX - halfWidth, baseY); // Bottom left
    ctx.lineTo(centerX + halfWidth, baseY); // Bottom right
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [color]);

  // Create the pin geometry with UVs that map arrow to top of sphere
  const geometry = useMemo(() => {
    const coneGeo = new THREE.ConeGeometry(radius, height, 32, 1, true);
    coneGeo.rotateX(Math.PI);

    // Sphere geometry - only top hemisphere
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

    // Rotate UVs so arrow appears at top pointing forward (-Z)
    // The arrow in texture is at the top (v near 0)
    // We want it at the north pole, pointing toward negative Z
    // By default, sphere UVs put u=0.5 at positive Z (front)
    // We need to shift u by 0.5 so u=0.5 points to negative Z
    const uvAttribute = sphereGeo.attributes.uv;
    for (let i = 0; i < uvAttribute.count; i++) {
      let u = uvAttribute.getX(i);
      let v = uvAttribute.getY(i);
      
      // Shift u by 0.5 so the arrow points toward -Z instead of +Z
      u = (u + 0.5) % 1.0;
      
      // Remap v so the top portion of texture covers the visible sphere
      // v=1 (pole) should map to v=0 (top of texture where arrow is)
      // v=0.5 (equator) should map to v=1 (bottom of texture)
      v = 1.0 - (v * 2.0); // Maps v from [0.5, 1] to [0, 1]
      
      uvAttribute.setXY(i, u, v);
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
  // heading 0 = North (negative Z), rotates counter-clockwise
  const rotationY = THREE.MathUtils.degToRad(-heading);

  const material = useMemo(() => {
    return createClayMaterial({
      color: color,
      map: arrowTexture,
    });
  }, [color, arrowTexture]);

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
