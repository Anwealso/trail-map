import { useMemo } from "react";
import * as THREE from "three";
import { TerrainSampler } from "../utils/terrainSampler";
import { createClayMaterial } from "../materials/clayMaterial";
import { worley2d, simplex2d } from "../utils/noise";
import { Coordinate } from "../utils/Coordinate";

interface TreesProps {
  terrainSampler: TerrainSampler;
  count?: number;
}

export function Trees({ terrainSampler, count = 150 }: TreesProps) {
  const foliageMat = useMemo(() => createClayMaterial({ color: "#3a5f25", roughness: 0.95, bumpScale: 0.04 }), []);
  const trunkMat = useMemo(() => createClayMaterial({ color: "#5d4037", roughness: 1.0, bumpScale: 0.03 }), []);

  // Pine tree parts - stacked cones for foliage
  const { foliage1Geo, foliage2Geo, foliage3Geo, trunkGeo } = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.015, 0.02, 0.15, 6);
    trunk.translate(0, 0.075, 0);

    const f1 = new THREE.ConeGeometry(0.12, 0.2, 6);
    f1.translate(0, 0.2, 0);

    const f2 = new THREE.ConeGeometry(0.09, 0.18, 6);
    f2.translate(0, 0.3, 0);

    const f3 = new THREE.ConeGeometry(0.06, 0.15, 6);
    f3.translate(0, 0.4, 0);

    return { foliage1Geo: f1, foliage2Geo: f2, foliage3Geo: f3, trunkGeo: trunk };
  }, []);

  const { matrices, actualCount } = useMemo(() => {
    const tempMatrices = new Float32Array(count * 16);
    const tempObject = new THREE.Object3D();
    
    let minH = Infinity;
    let maxH = -Infinity;
    const points = terrainSampler.mapPoints;
    for (const row of points) {
      for (const p of row) {
        if (p.threeY < minH) minH = p.threeY;
        if (p.threeY > maxH) maxH = p.threeY;
      }
    }

    const minTreeHeight = minH + (maxH - minH) * 0.2;
    const maxTreeHeight = minH + (maxH - minH) * 0.8;

    let placedCount = 0;
    const maxAttempts = count * 20;

    const centerX = 5;
    const centerZ = 5;
    const radius = 4.8;

    for (let i = 0; i < maxAttempts && placedCount < count; i++) {
      // Pick a random point within the circle
      const r_val = Math.sqrt(Math.random()) * radius;
      const theta = Math.random() * 2 * Math.PI;
      const x = centerX + r_val * Math.cos(theta);
      const z = centerZ + r_val * Math.sin(theta);

      const p = terrainSampler.getClosestMapPoint(Coordinate.fromGameCoords(x, z));
      if (!p) continue;

      // Avoid placing trees on the trail if possible
      // (This is a bit hard without the trail texture here, but we can just use randomness)
      
      if (p.threeY >= minTreeHeight && p.threeY <= maxTreeHeight) {
        // Use Worley noise to create glades
        const noiseVal = worley2d(x * 0.8, z * 0.8);
        if (noiseVal > 0.35) continue;

        const wobble = simplex2d(x * 1.5, z * 1.5) * 0.05;
        tempObject.position.set(x, p.threeY + wobble, z);
        tempObject.rotation.y = Math.random() * Math.PI * 2;
        const scale = 0.25 + Math.random() * 0.35;
        tempObject.scale.set(scale, scale, scale);
        
        tempObject.updateMatrix();
        tempObject.matrix.toArray(tempMatrices, placedCount * 16);
        placedCount++;
      }
    }

    return { matrices: tempMatrices.slice(0, placedCount * 16), actualCount: placedCount };
  }, [terrainSampler, count]);

  return (
    <group>
      <instancedMesh args={[trunkGeo, trunkMat, actualCount]} frustumCulled={false} onUpdate={(self) => {
        self.instanceMatrix.set(matrices);
        self.instanceMatrix.needsUpdate = true;
      }} />
      <instancedMesh args={[foliage1Geo, foliageMat, actualCount]} frustumCulled={false} onUpdate={(self) => {
        self.instanceMatrix.set(matrices);
        self.instanceMatrix.needsUpdate = true;
      }} />
      <instancedMesh args={[foliage2Geo, foliageMat, actualCount]} frustumCulled={false} onUpdate={(self) => {
        self.instanceMatrix.set(matrices);
        self.instanceMatrix.needsUpdate = true;
      }} />
      <instancedMesh args={[foliage3Geo, foliageMat, actualCount]} frustumCulled={false} onUpdate={(self) => {
        self.instanceMatrix.set(matrices);
        self.instanceMatrix.needsUpdate = true;
      }} />
    </group>
  );
}
