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

    // Create white arrow on top
    const arrowShape = new THREE.Shape();
    const arrowSize = radius * 1.2;
    const arrowHalfWidth = arrowSize * 0.4;

    // Triangle pointing up (in local Y)
    arrowShape.moveTo(0, arrowSize); // Tip
    arrowShape.lineTo(-arrowHalfWidth, 0); // Bottom left
    arrowShape.lineTo(arrowHalfWidth, 0); // Bottom right
    arrowShape.lineTo(0, arrowSize); // Back to tip

    const arrowGeo = new THREE.ExtrudeGeometry(arrowShape, {
      depth: radius * 0.15,
      bevelEnabled: false,
    });
    arrowGeo.rotateX(-Math.PI / 2); // Lay flat
    arrowGeo.rotateY(Math.PI); // Point in -Z direction initially
    arrowGeo.translate(0, sphereOffset + sphereRadius * 0.3, 0); // Position on top of sphere

    // Count vertices for each geometry BEFORE merging
    const coneCount = coneGeo.attributes.position.count;
    const sphereCount = sphereGeo.attributes.position.count;

    let merged = BufferGeometryUtils.mergeGeometries([coneGeo, sphereGeo, arrowGeo]);
    merged = BufferGeometryUtils.mergeVertices(merged);
    merged.computeVertexNormals();

    // Create color attribute
    const count = merged.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const colorObj = new THREE.Color(color);
    const whiteColor = new THREE.Color("#ffffff");

    // After mergeVertices, the vertex count changes, so we need to estimate
    // The arrow vertices are at the end before mergeVertices
    // After mergeVertices, vertices are deduplicated
    // We'll use a heuristic: arrow vertices have higher Y values
    const positions = merged.attributes.position.array as Float32Array;
    const arrowYThreshold = sphereOffset + sphereRadius * 0.2;

    for (let i = 0; i < count; i++) {
      const y = positions[i * 3 + 1]; // Y coordinate
      if (y > arrowYThreshold) {
        // Likely arrow - use white
        colors[i * 3] = whiteColor.r;
        colors[i * 3 + 1] = whiteColor.g;
        colors[i * 3 + 2] = whiteColor.b;
      } else {
        // Pin body - use specified color
        colors[i * 3] = colorObj.r;
        colors[i * 3 + 1] = colorObj.g;
        colors[i * 3 + 2] = colorObj.b;
      }
    }

    merged.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    return merged;
  }, [radius, height, sphereRadius, sphereOffset, coneAngle, color]);

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

  // Calculate rotation based on heading (degrees to radians)
  // heading 0 = North, rotate around Y axis
  // In Three.js, rotation is counter-clockwise, so we negate heading
  const rotationY = THREE.MathUtils.degToRad(-heading);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.4,
      metalness: 0.1,
    });
  }, []);

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
