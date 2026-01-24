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

  // Fractal noise implementation using octaves of sine waves
  const getNoise = (nx: number, ny: number) => {
    let v = 0.0;

    // Layer 1: Large "hand-moulded" unevenness
    v += Math.sin(nx * 4.0 + Math.cos(ny * 3.0)) * 0.5;
    v += Math.cos(ny * 4.5 + Math.sin(nx * 3.5)) * 0.5;

    // Layer 2: Medium "dents and presses"
    v += Math.sin(nx * 15.0 + ny * 10.0) * 0.2;
    v += Math.cos(nx * 12.0 - ny * 18.0) * 0.2;

    // Layer 3: High-frequency "fingerprints"
    // Swirling patterns created by nested sines
    const swirl = Math.sin(nx * 100.0 + Math.sin(ny * 100.0) * 5.0);
    v += swirl * 0.15;

    // Layer 4: Fine clay grain
    v += (Math.random() - 0.5) * 0.1;

    return (v + 1.5) / 3.0; // Normalize roughly to 0-1
  };

  for (let i = 0; i < size; i++) {
    const x = i % width;
    const y = Math.floor(i / width);

    const nx = x / width;
    const ny = y / height;

    const noise = getNoise(nx, ny);
    const bumpVal = Math.floor(Math.max(0, Math.min(1, noise)) * 255);

    // Bias roughness map to be higher to ensure it stays matte and "dry"
    const bias = 0.3;
    const roughnessVal = Math.floor((bias + noise * (1 - bias)) * 255);

    data[i * 4] = bumpVal; // R (Bump)
    data[i * 4 + 1] = roughnessVal; // G (Roughness Map - must be high for matte)
    data[i * 4 + 2] = bumpVal; // B
    data[i * 4 + 3] = 255; // A
  }

  const texture = new THREE.DataTexture(data, width, height);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.needsUpdate = true;
  return texture;
}

export function createClayMaterial({
  color = 0xc28564, // Terracotta/Clay color
  roughness = 0.9, // Very matte base
  metalness = 0.0,
  bumpScale = 0.08, // Increased for more visible texture
  side = THREE.FrontSide,
}: ClayMaterialParams = {}): THREE.MeshStandardMaterial {
  const clayTexture = createClayBumpMap();

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    bumpMap: clayTexture,
    bumpScale,
    roughnessMap: clayTexture,
    side,
    transparent: true,
  });

  return mat;
}
