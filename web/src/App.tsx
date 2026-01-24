import { useState, useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Terrain } from "./components/Terrain";
import { Trail } from "./components/Trail";
import { Pin } from "./components/Pin";
import { getFinalMapMeshPointMatrix } from "./utils/heightmapToMesh";
import {
  createTerrainHeightSamplerFromPointMatrix,
  TerrainSampler,
} from "./utils/terrainSampler";
import {
  TOPOMAP_GAME_SIZE_LIMIT_X,
  TOPOMAP_GAME_SIZE_LIMIT_Y,
} from "./utils/constants";

export default function App() {
  const [pinPosition] = useState({ x: 4, y: 6 }); // world coordinates in km; map spans [0,10] x [0,10]
  const [terrainSampler, setterrainSampler] = useState<TerrainSampler | null>(
    null,
  );
  const [autoRotate, setAutoRotate] = useState(true);
  const autoRotateTimer = useRef<number | null>(null);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    getFinalMapMeshPointMatrix(`${base}heightmap.jpg`).then((points) => {
      setterrainSampler(createTerrainHeightSamplerFromPointMatrix(points));
    });
  }, []);

  const orbitTarget = useMemo(() => {
    const cx = TOPOMAP_GAME_SIZE_LIMIT_X / 2;
    const cz = TOPOMAP_GAME_SIZE_LIMIT_Y / 2;
    if (!terrainSampler?.mapPoints?.length) return [cx, 0, cz] as const;
    let minY = Infinity;
    for (const row of terrainSampler.mapPoints) {
      for (const p of row) {
        if (p.threeY < minY) minY = p.threeY;
      }
    }
    return [cx, minY === Infinity ? 0 : minY, cz] as const;
  }, [terrainSampler]);

  const handleInteractionStart = () => {
    setAutoRotate(false);
    if (autoRotateTimer.current) {
      window.clearTimeout(autoRotateTimer.current);
    }
  };

  const handleInteractionEnd = () => {
    if (autoRotateTimer.current) {
      window.clearTimeout(autoRotateTimer.current);
    }
    autoRotateTimer.current = window.setTimeout(() => {
      setAutoRotate(true);
    }, 5000);
  };

  return (
    <Canvas shadows camera={{ position: [8, 8, 8], fov: 50 }}>
      {/* Soft overall ambient fill */}
      <ambientLight intensity={0.4} />

      {/* Warm Key Light (Sun) - casts the main shadows */}
      <directionalLight
        position={[10, 15, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Cool Fill Light - softens the shadows from the side */}
      <pointLight position={[-10, 5, -5]} intensity={0.5} color="#cbd5e1" />

      {/* Rim Light - highlights the clay edges from behind */}
      <spotLight
        position={[0, 10, -10]}
        intensity={0.8}
        angle={0.3}
        penumbra={1}
      />

      {/* <axesHelper args={[2]} /> */}
      {terrainSampler && <Terrain mapPoints={terrainSampler.mapPoints} />}
      {terrainSampler && (
        <Trail
          csvUrl={`${import.meta.env.BASE_URL}trail.csv`}
          width={0.1}
          terrainSampler={terrainSampler}
          color={"#fff4bd"}
        />
      )}
      {terrainSampler && (
        <Pin
          x={pinPosition.x}
          y={pinPosition.y}
          terrainSampler={terrainSampler}
          color="#ff4444"
          radius={0.15}
        />
      )}
      <OrbitControls
        target={orbitTarget}
        enablePan={false}
        maxPolarAngle={Math.PI / 2 - (Math.PI / 180) * 20}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        onStart={handleInteractionStart}
        onEnd={handleInteractionEnd}
      />
    </Canvas>
  );
}
