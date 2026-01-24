import { useState, useEffect } from "react";
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

export default function App() {
  const [pinPosition, setPinPosition] = useState({ x: -2, y: 3 }); // world coordinates in kilometers
  const [terrainSampler, setterrainSampler] = useState<TerrainSampler | null>(
    null,
  );
  const [mapPoints, setMapPoints] = useState<Point[][] | null>(null);

  // useEffect(() => {
  //   getFinalMapMeshPointMatrix("/heightmap.jpg").then((points) => {
  //     setMapPoints(points);
  //   });
  // }, []);
  useEffect(() => {
    getFinalMapMeshPointMatrix("/heightmap.jpg").then((points) => {
      setterrainSampler(createTerrainHeightSamplerFromPointMatrix(points));
    });
  }, []);

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
      <OrbitControls />
    </Canvas>
  );
}
