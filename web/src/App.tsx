import { useState, useEffect, useMemo } from "react";
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
import { Point } from "./utils/Point";
import {
  TOPOMAP_GAME_SIZE_LIMIT_X,
  TOPOMAP_GAME_SIZE_LIMIT_Y,
} from "./utils/constants";

export default function App() {
  const [pinPosition, setPinPosition] = useState({ x: 4, y: 6 }); // world coordinates in km; map spans [0,10] x [0,10]
  const [terrainSampler, setterrainSampler] = useState<TerrainSampler | null>(
    null,
  );
  const [mapPoints, setMapPoints] = useState<Point[][] | null>(null);

  useEffect(() => {
    getFinalMapMeshPointMatrix("/heightmap.jpg").then((points) => {
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

  return (
    <Canvas camera={{ position: [8, 8, 8], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <axesHelper args={[2]} />
      {terrainSampler && <Terrain mapPoints={terrainSampler.mapPoints} />}
      {terrainSampler && (
        <Trail
          csvUrl="/trail.csv"
          width={0.1}
          terrainSampler={terrainSampler}
          color={"#eaffdc"}
        />
      )}
      {terrainSampler && (
        <Pin
          x={pinPosition.x}
          y={pinPosition.y}
          terrainSampler={terrainSampler}
          color="#ff4444"
          radius={0.2}
        />
      )}
      <OrbitControls
        target={orbitTarget}
        enablePan={false}
        maxPolarAngle={Math.PI / 2 - ((Math.PI / 180) * 20)}
      />
    </Canvas>
  );
}
