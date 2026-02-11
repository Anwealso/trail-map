import { useEffect, useState } from "react";
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

export function useTrailTexture(csvUrl: string | null) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!csvUrl) {
      setTexture(null);
      return;
    }

    let isMounted = true;

    loadTrailCSV(csvUrl).then((points) => {
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
      points.forEach((p, i) => {
        const u = p.x / TOPOMAP_WORLD_SIZE_X;
        const v = 1 - p.y / TOPOMAP_WORLD_SIZE_Y;
        
        const cx = u * canvas.width;
        const cy = v * canvas.height;
        
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();

      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      setTexture(tex);
    });

    return () => {
      isMounted = false;
    };
  }, [csvUrl]);

  return texture;
}
