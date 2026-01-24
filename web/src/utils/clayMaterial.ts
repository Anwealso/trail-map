import * as THREE from "three";

interface ClayMaterialParams {
  color?: THREE.ColorRepresentation;
  roughness?: number;
  metalness?: number;
  bumpScale?: number;
  side?: THREE.Side;
}

function createClayBumpMap(): THREE.Texture {
  const width = 1024;
  const height = 1024;
  const size = width * height;
  const data = new Uint8Array(4 * size);

  const scale = 30.0;

  for (let i = 0; i < size; i++) {
    const x = i % width;
    const y = Math.floor(i / width);

    // Normalize coordinates (0 to 1)
    const nx = x / width;
    const ny = y / height;

    // Generate pseudo-noise using interacting sine waves to mimic "fingerprints" / uneven clay
    let v = 0.0;
    v += Math.sin(nx * scale + Math.sin(ny * scale * 0.5) * 2.0);
    v += Math.sin(ny * scale * 1.2 + Math.cos(nx * scale * 1.5) * 2.0);
    v += Math.sin((nx + ny) * scale * 2.0) * 0.3;

    // Noise layer for roughness
    v += (Math.random() - 0.5) * 0.5;

    // Normalize to 0-1 range (approximate, v ranges roughly -3 to 3)
    const n = (v + 3.0) / 6.0;
    const clamped = Math.max(0, Math.min(1, n));
    const val = Math.floor(clamped * 255);

    data[i * 4] = val; // R
    data[i * 4 + 1] = val; // G
    data[i * 4 + 2] = val; // B
    data[i * 4 + 3] = 255; // A
  }

  const texture = new THREE.DataTexture(data, width, height);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4); // Repeat across the terrain
  texture.needsUpdate = true;
  return texture;
}

export function createClayMaterial({
  color = 0xc28564, // Terracotta/Clay color
  roughness = 0.8, // Matte finish
  metalness = 0.0,
  bumpScale = 0.02, // Subtle surface imperfection
  side = THREE.FrontSide,
}: ClayMaterialParams = {}): THREE.MeshStandardMaterial {
  const bumpMap = createClayBumpMap();

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    bumpMap,
    bumpScale,
    side,
    transparent: true,
  });

  return mat;
}
