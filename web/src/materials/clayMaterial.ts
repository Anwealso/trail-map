import * as THREE from "three";

interface ClayMaterialParams {
  color?: THREE.ColorRepresentation;
  roughness?: number;
  metalness?: number;
  bumpScale?: number;
  side?: THREE.Side;
}

function createClayTexture(): {
  map: THREE.Texture;
  bumpMap: THREE.Texture;
  roughnessMap: THREE.Texture;
} {
  const width = 1024;
  const height = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  // Helper for random in range
  const lerp = (min: number, max: number, t: number) => min + (max - min) * t;

  const drawSpeckleLayer = (
    count: number,
    sizeRange: [number, number],
    alphaRange: [number, number],
    sidesRange: [number, number],
    uniformity: number,
    color: string,
  ) => {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const alpha = lerp(alphaRange[0], alphaRange[1], Math.random());
      const sides = Math.floor(
        lerp(sidesRange[0], sidesRange[1] + 1, Math.random()),
      );
      const size = lerp(sizeRange[0], sizeRange[1], Math.random());
      const startAngle = Math.random() * Math.PI * 2;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let j = 0; j < sides; j++) {
        const dist = lerp(size * uniformity, size, Math.random());
        const angle = startAngle + (Math.PI * 2 * j) / sides;
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  };

  // Base Layer
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Speckle Layers - shrunk size further and increased count significantly
  drawSpeckleLayer(30000, [0.05, 0.4], [0.1, 0.6], [3, 6], 0.5, "#000000");
  drawSpeckleLayer(30000, [0.05, 0.4], [0.1, 0.6], [3, 6], 0.5, "#ffffff");
  drawSpeckleLayer(15000, [0.05, 0.3], [0.1, 0.5], [3, 6], 0.5, "#221100");

  const mapTexture = new THREE.CanvasTexture(canvas);
  mapTexture.wrapS = mapTexture.wrapT = THREE.RepeatWrapping;

  // Bump & Roughness Data
  const size = width * height;
  const bumpData = new Uint8Array(size);
  const roughnessData = new Uint8Array(size);

  const getNoise = (nx: number, ny: number) => {
    let v = 0.0;
    // Macro texture (uneven surface)
    v += Math.sin(nx * 4.0 + Math.cos(ny * 3.0)) * 0.5;
    v += Math.cos(ny * 4.5 + Math.sin(nx * 3.5)) * 0.5;
    // Medium imperfections
    v += Math.sin(nx * 20.0 + ny * 15.0) * 0.2;
    // High frequency grit
    v += (Math.random() - 0.5) * 0.3;
    return (v + 1.5) / 3.0;
  };

  for (let i = 0; i < size; i++) {
    const nx = (i % width) / width;
    const ny = Math.floor(i / width) / height;
    const n = getNoise(nx, ny);
    bumpData[i] = Math.floor(Math.max(0, Math.min(1, n)) * 255);
    // Pockmarks/Grit are rougher
    roughnessData[i] = Math.floor(lerp(0.95, 1.0, n) * 255);
  }

  const bumpMap = new THREE.DataTexture(
    bumpData,
    width,
    height,
    THREE.RedFormat,
  );
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.needsUpdate = true;

  const roughnessMap = new THREE.DataTexture(
    roughnessData,
    width,
    height,
    THREE.RedFormat,
  );
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.needsUpdate = true;

  return { map: mapTexture, bumpMap, roughnessMap };
}

export function createClayMaterial({
  color = 0xc28564,
  roughness = 1.0,
  metalness = 0.0,
  bumpScale = 0.08,
  side = THREE.FrontSide,
}: ClayMaterialParams = {}): THREE.MeshPhysicalMaterial {
  const textures = createClayTexture();

  const mat = new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    map: textures.map,
    bumpMap: textures.bumpMap,
    bumpScale,
    roughnessMap: textures.roughnessMap,
    side,
    transparent: true,
    clearcoat: 0.0,
    reflectivity: 0.0,
  });

  return mat;
}
