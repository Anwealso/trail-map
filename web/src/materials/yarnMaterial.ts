import * as THREE from "three";

function createYarnTexture(): {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
} {
  const width = 512;
  const height = 512;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  // Helper for random in range
  const lerp = (min: number, max: number, t: number) => min + (max - min) * t;

  // Base Red Color
  // Yarn isn't solid red, it has shadows between strands.
  // We want diagonal stripes.

  const drawTexture = (type: "color" | "normal" | "roughness") => {
    // Fill background
    if (type === "color") {
      ctx.fillStyle = "#808080"; // Mid-gray base for tinting
    } else if (type === "normal") {
      ctx.fillStyle = "#8080ff"; // Flat normal
    } else {
      ctx.fillStyle = "#ff0000"; // High roughness
    }
    ctx.fillRect(0, 0, width, height);

    // Draw twisted strands (diagonal lines)
    const numStrands = 10; // Adjusted ridges (was 12)
    const strandWidth = width / numStrands;
    const angle = Math.PI / 4; // 45 degrees

    for (let i = -numStrands; i < numStrands * 2; i++) {
      ctx.save();
      // Translate to start of stripe
      // We want lines that go across uv.x and uv.y.
      // Tube mapping: x is length, y is circumference.
      // We want the twist to spiral. So as x increases, y shifts.
      // Drawing diagonal lines on the texture will achieve this.

      // For normal map generation from canvas, we usually draw grayscale height and convert,
      // or draw approximate normal colors.
      // Let's keep it simple: Color map has details, Normal map has bumps.
      
      // Let's create a gradient for each strand to look round
      const x = i * strandWidth;
      
      // We'll just draw vertical stripes and let the texture rotation or UVs handle the twist?
      // No, let's draw diagonal stripes.
      
      ctx.translate(x, 0);
      ctx.rotate(angle);
      
      if (type === "color") {
        const gradient = ctx.createLinearGradient(-strandWidth/2, 0, strandWidth/2, 0);
        gradient.addColorStop(0, "#404040"); // Shadow (Dark gray)
        gradient.addColorStop(0.5, "#ffffff"); // Highlight (White)
        gradient.addColorStop(1, "#404040"); // Shadow
        ctx.fillStyle = gradient;
        ctx.fillRect(-strandWidth/2, -height * 2, strandWidth, height * 4);
      } else if (type === "normal") {
        // Pseudo-normal map drawing is hard in 2D context directly without pixel manipulation.
        // Let's skip drawing normals directly and just use a bump map approach or simple color for now.
        // Actually, let's just make a height map (grayscale) and rely on bumpMap.
        // It's easier.
      } else {
        // Roughness: fuzzy
        ctx.fillStyle = "#dddddd"; // Mostly rough
        ctx.fillRect(-strandWidth/2, -height * 2, strandWidth, height * 4);
      }
      
      ctx.restore();
    }

    // Add "Furry" noise
    const noiseCount = 50000;
    for (let i = 0; i < noiseCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const len = 2 + Math.random() * 5;
      const angle = Math.random() * Math.PI * 2;
      
      if (type === "color") {
        ctx.strokeStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
        ctx.globalAlpha = 0.2;
      } else {
        ctx.strokeStyle = "#ffffff";
        ctx.globalAlpha = 0.1;
      }
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  };

  // Draw Color Map
  drawTexture("color");
  const mapTexture = new THREE.CanvasTexture(canvas);
  mapTexture.wrapS = mapTexture.wrapT = THREE.RepeatWrapping;
  // Repeat the texture along the tube to maintain twist density
  mapTexture.repeat.set(100, 1); 
  mapTexture.needsUpdate = true; 

  // Draw Bump/Roughness (Grayscale)
  // Reusing canvas for efficiency
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, width, height);
  
  // Draw strands for height
  const numStrands = 10; // Adjusted ridges
  const strandWidth = width / numStrands;
  const angle = Math.PI / 4;
  
  for (let i = -numStrands; i < numStrands * 2; i++) {
     ctx.save();
     const x = i * strandWidth;
     ctx.translate(x, 0);
     ctx.rotate(angle);
     
     const gradient = ctx.createLinearGradient(-strandWidth/2, 0, strandWidth/2, 0);
     gradient.addColorStop(0, "#000000"); // Deep
     gradient.addColorStop(0.5, "#ffffff"); // High
     gradient.addColorStop(1, "#000000"); // Deep
     ctx.fillStyle = gradient;
     ctx.fillRect(-strandWidth/2, -height * 2, strandWidth, height * 4);
     ctx.restore();
  }
  
  // Noise for fuzz bump
  const noiseCount = 50000;
  ctx.strokeStyle = "#ffffff";
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < noiseCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const len = 2 + Math.random() * 5;
      const angle = Math.random() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
  }
  
  const bumpTexture = new THREE.CanvasTexture(canvas);
  bumpTexture.wrapS = bumpTexture.wrapT = THREE.RepeatWrapping;
  bumpTexture.repeat.set(100, 1);

  // Roughness: Uniformly rough for yarn
  const roughnessTexture = new THREE.CanvasTexture(canvas); // Reuse bump for roughness variation? Sure.
  roughnessTexture.wrapS = roughnessTexture.wrapT = THREE.RepeatWrapping;
  roughnessTexture.repeat.set(100, 1);
  
  // Fake normal map from bump for now or just return bump
  // The function signature asked for normalMap, but MeshStandardMaterial can take bumpMap.
  // I'll return bump as normalMap for the interface but use it as bumpMap in material.
  
  return { map: mapTexture, normalMap: bumpTexture, roughnessMap: roughnessTexture };
}

interface YarnMaterialParams {
  color?: THREE.ColorRepresentation;
}

export function createYarnMaterial({
  color = 0xffffff,
}: YarnMaterialParams = {}): THREE.MeshStandardMaterial {
  const textures = createYarnTexture();

  const mat = new THREE.MeshStandardMaterial({
    color, // Texture provides color
    map: textures.map,
    bumpMap: textures.normalMap, // Using the height texture
    bumpScale: 0.1,
    roughness: 0.9,
    roughnessMap: textures.roughnessMap,
    side: THREE.DoubleSide,
  });

  return mat;
}
