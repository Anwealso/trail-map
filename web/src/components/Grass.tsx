import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { TerrainSampler } from "../utils/terrainSampler";
import { createGrassMaterial } from "../materials/grassMaterial";
import { Coordinate } from "../utils/Coordinate";
import { simplex2d, fbm2d } from "../utils/noise";

interface GrassProps {
  terrainSampler: TerrainSampler;
  count?: number;
}

export function Grass({ terrainSampler, count = 500000 }: GrassProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(() => createGrassMaterial(), []);

  // Create a tapered blade geometry
  const geometry = useMemo(() => {
    const height = 0.04; // 1/2 as long again (was 0.08)
    const width = 0.004; // slightly thinner
    const geo = new THREE.PlaneGeometry(width, height, 1, 4);
    geo.translate(0, height / 2, 0); // Move origin to bottom
    
    // Taper the top vertices
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > height * 0.4) {
        const t = (y - height * 0.4) / (height * 0.6);
        const widthScale = 1.0 - Math.pow(t, 2.0);
        pos.setX(i, pos.getX(i) * widthScale);
      }
    }
    return geo;
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

    const midHeight = minH + (maxH - minH) * 0.45; 

    let placedCount = 0;
    const maxAttempts = count * 25; // Even higher attempts to satisfy noise masking

    const centerX = 5; 
    const centerZ = 5;
    const radius = 5;

    for (let i = 0; i < maxAttempts && placedCount < count; i++) {
      // Pick a random point within the circle
      const r_val = Math.sqrt(Math.random()) * radius;
      const theta = Math.random() * 2 * Math.PI;
      const x = centerX + r_val * Math.cos(theta);
      const z = centerZ + r_val * Math.sin(theta);

      // Use FBM noise for realistic foliage patches
      // We use a low frequency (0.4) for large-scale clumping
      const noiseVal = fbm2d(x * 0.4, z * 0.4, 3);
      // Normalize to 0-1 and apply a power function for sharper "peaks" of growth
      const normalizedNoise = Math.max(0, noiseVal * 0.5 + 0.5);
      const density = Math.pow(normalizedNoise, 2.5);
      
      if (Math.random() > density) continue;

      const p = terrainSampler.getClosestMapPoint(Coordinate.fromGameCoords(x, z));
      if (!p) continue;

      if (p.threeY < midHeight && p.threeY > minH + 0.1) {
        const wobble = simplex2d(x * 1.5, z * 1.5) * 0.05;
        tempObject.position.set(x, p.threeY + wobble, z);
        tempObject.rotation.y = Math.random() * Math.PI;
        const scale = 0.6 + Math.random() * 0.5;
        tempObject.scale.set(scale, scale, scale);
        
        tempObject.updateMatrix();
        tempObject.matrix.toArray(tempMatrices, placedCount * 16);
        placedCount++;
      }
    }

    return { 
      matrices: tempMatrices.slice(0, placedCount * 16), 
      actualCount: placedCount 
    };
  }, [terrainSampler, count]);

  useFrame((state) => {
    if (material.uniforms.uTime) {
      material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, actualCount]}
      frustumCulled={false}
      onUpdate={(self) => {
        self.instanceMatrix.set(matrices);
        self.instanceMatrix.needsUpdate = true;
      }}
    />
  );
}
