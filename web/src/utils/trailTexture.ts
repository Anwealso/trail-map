import { useEffect, useState, useRef } from "react";
import * as THREE from "three";
import { TOPOMAP_WORLD_SIZE_X, TOPOMAP_WORLD_SIZE_Y } from "./constants";

async function loadTrailCSV(url: string): Promise<{ x: number; y: number }[]> {
  const response = await fetch(url);
  const text = await response.text();
  const lines = text.trim().split("\n");

  return lines.slice(1).map((line) => {
    const [x, y] = line.split(",").map(Number);
    return { x, y };
  });
}

export interface TrailSampler {
  isOnTrail: (worldX: number, worldY: number) => boolean;
}

export function useTrailTexture(csvUrl: string | null) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [sampler, setSampler] = useState<TrailSampler | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);

  useEffect(() => {
    if (!csvUrl) {
      setTexture(null);
      setSampler(null);
      imageDataRef.current = null;
      return;
    }

    let isMounted = true;

    loadTrailCSV(csvUrl).then((loadedPoints) => {
      if (!isMounted) return;

      const canvas = document.createElement("canvas");
      canvas.width = 2048;
      canvas.height = 2048;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "white";
      ctx.lineWidth = 8;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.shadowBlur = 12;
      ctx.shadowColor = "white";

      ctx.beginPath();
      loadedPoints.forEach((p, i) => {
        const u = p.x / TOPOMAP_WORLD_SIZE_X;
        const v = p.y / TOPOMAP_WORLD_SIZE_Y;
        
        const cx = u * canvas.width;
        const cy = v * canvas.height;
        
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();

      // Store image data for CPU-side sampling
      imageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Create sampler function
      const trailSampler: TrailSampler = {
        isOnTrail: (worldX: number, worldY: number) => {
          if (!imageDataRef.current) return false;
          
          // Convert world coordinates to texture coordinates
          const u = worldX / TOPOMAP_WORLD_SIZE_X;
          const v = worldY / TOPOMAP_WORLD_SIZE_Y;
          
          // Clamp to valid range
          if (u < 0 || u > 1 || v < 0 || v > 1) return false;
          
          // Convert to pixel coordinates
          const px = Math.floor(u * canvas.width);
          const py = Math.floor(v * canvas.height);
          
          // Get pixel value (check if it's bright - on trail)
          const index = (py * canvas.width + px) * 4;
          const red = imageDataRef.current.data[index];
          
          // White pixels (trail) have high red values
          return red > 128;
        }
      };

      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      setTexture(tex);
      setSampler(trailSampler);
    });

    return () => {
      isMounted = false;
    };
  }, [csvUrl]);

  return { texture, sampler };
}
