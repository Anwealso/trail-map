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

  // Create the pin geometry (cone + sphere as before)
  const geometry = useMemo(() => {
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

  // Create arrow texture on canvas
  const arrowTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;

    // Clear background
    ctx.fillStyle = "rgba(255, 255, 255, 0)";
    ctx.fillRect(0, 0, 128, 128);

    // Draw white triangle arrow pointing up
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(64, 20); // Tip (top center)
    ctx.lineTo(24, 108); // Bottom left
    ctx.lineTo(104, 108); // Bottom right
    ctx.closePath();
    ctx.fill();

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  // Arrow plane geometry - positioned on top of the pin
  const arrowGeometry = useMemo(() => {
    const arrowSize = radius * 1.5;
    const arrowY = sphereOffset + sphereRadius * 0.15;
    
    const planeGeo = new THREE.PlaneGeometry(arrowSize, arrowSize);
    planeGeo.rotateX(-Math.PI / 2); // Lay flat
    planeGeo.translate(0, arrowY, 0); // Position on top of sphere
    
    return planeGeo;
  }, [radius, sphereRadius, sphereOffset]);

  const pinMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.4,
      metalness: 0.1,
    });
  }, [color]);

  const arrowMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: arrowTexture,
      transparent: true,
      roughness: 0.4,
      metalness: 0.1,
    });
  }, [arrowTexture]);

  if (!position) return null;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={geometry} material={pinMaterial} />
      <mesh geometry={arrowGeometry} material={arrowMaterial} />
    </group>
  );
}
