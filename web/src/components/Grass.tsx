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

  // Create a tufted grass geometry (2 crossed blades)
  const geometry = useMemo(() => {
    const height = 0.04;
    const width = 0.006;
    const bladeGeo = new THREE.PlaneGeometry(width, height, 1, 4);
    bladeGeo.translate(0, height / 2, 0);
    
    // Taper the top vertices
    const pos = bladeGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > height * 0.4) {
        const t = (y - height * 0.4) / (height * 0.6);
        const widthScale = 1.0 - Math.pow(t, 2.0);
        pos.setX(i, pos.getX(i) * widthScale);
      }
    }

    const tuftGeo = new THREE.BufferGeometry();
    const blade1 = bladeGeo.clone();
    const blade2 = bladeGeo.clone();
    blade2.rotateY(Math.PI / 2);
    
    const pos1 = blade1.attributes.position.array as Float32Array;
    const pos2 = blade2.attributes.position.array as Float32Array;
    const mergedPos = new Float32Array(pos1.length + pos2.length);
    mergedPos.set(pos1);
    mergedPos.set(pos2, pos1.length);
    tuftGeo.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));

    const uv1 = blade1.attributes.uv.array as Float32Array;
    const uv2 = blade2.attributes.uv.array as Float32Array;
    const mergedUv = new Float32Array(uv1.length + uv2.length);
    mergedUv.set(uv1);
    mergedUv.set(uv2, uv1.length);
    tuftGeo.setAttribute('uv', new THREE.BufferAttribute(mergedUv, 2));

    const normal1 = blade1.attributes.normal.array as Float32Array;
    const normal2 = blade2.attributes.normal.array as Float32Array;
    const mergedNormal = new Float32Array(normal1.length + normal2.length);
    mergedNormal.set(normal1);
    mergedNormal.set(normal2, normal1.length);
    tuftGeo.setAttribute('normal', new THREE.BufferAttribute(mergedNormal, 3));
    
    const index1 = blade1.index!.array as Uint16Array;
    const index2 = blade2.index!.array as Uint16Array;
    const mergedIndex = new Uint16Array(index1.length + index2.length);
    mergedIndex.set(index1);
    const offset = blade1.attributes.position.count;
    for (let i = 0; i < index2.length; i++) {
      mergedIndex[index1.length + i] = index2[i] + offset;
    }
    tuftGeo.setIndex(new THREE.BufferAttribute(mergedIndex, 1));
    
    return tuftGeo;
  }, []);

  const { matrices, actualCount } = useMemo(() => {
    const tempMatrices = new Float32Array(count * 16);
    const tempObject = new THREE.Object3D();
    
    let minH = Infinity;
    let maxH = -Infinity;
    const points = terrainSampler.mapPoints;
    for (const row of points) {
      for (const p of row) {
        if (p.gameZ < minH) minH = p.gameZ;
        if (p.gameZ > maxH) maxH = p.gameZ;
      }
    }

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
      // Higher frequency (1.27) for more numerous "nodes"
      const noiseVal = fbm2d(x * 1.273, z * 1.273, 3);
      // Normalize to 0-1 and apply a power function for sharper "peaks" of growth
      const normalizedNoise = Math.max(0, noiseVal * 0.5 + 0.5);
      // Lower power (1.2) means the patches are less "dense" at their core
      const density = Math.pow(normalizedNoise, 1.2);
      
      if (Math.random() > density) continue;

      const coord = Coordinate.fromGameCoords(x, z);
      const h = terrainSampler.getHeightAt(coord);
      
      const normalizedH = (h - minH) / Math.max(0.0001, maxH - minH);
      
      // Start grass slightly above the water line (0.102)
      if (normalizedH < 0.45 && normalizedH > 0.11) {
        const wobble = simplex2d(x * 1.492, z * 1.492) * 0.05;
        tempObject.position.set(x, h + wobble, z);
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
    const uTime = (material as any).userData?.uTime;
    if (uTime) {
      uTime.value = state.clock.elapsedTime;
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
