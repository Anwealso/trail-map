import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Terrain } from './components/Terrain'
import { Trail } from './components/Trail'
import { Pin } from './components/Pin'
import { createTerrainHeightSampler, TerrainHeightSampler } from './utils/heightmapToMesh'

export default function App() {
  const [pinPosition, setPinPosition] = useState({ x: -2, y: 3 }) // world coordinates in kilometers
  const [heightSampler, setHeightSampler] = useState<TerrainHeightSampler | null>(null)

  useEffect(() => {
    createTerrainHeightSampler('/heightmap.jpg').then((sampler) => {
      setHeightSampler(sampler)
    })
  }, [])

  return (
    <Canvas camera={{ position: [8, 8, 8], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <axesHelper args={[2]} />
      {heightSampler && (
        <Terrain
          heightSampler={heightSampler}
        /* heightmapUrl="/heightmap.jpg" 
        width={TERRAIN_WIDTH} 
        depth={TERRAIN_DEPTH} 
        heightScale={HEIGHT_SCALE} */
        />
      )}
      {/* <Trail
        csvUrl="/trail.csv"
        heightmapUrl="/heightmap.jpg"
        terrainWidth={TERRAIN_WIDTH}
        terrainDepth={TERRAIN_DEPTH}
        heightScale={HEIGHT_SCALE}
      /> */}
      {heightSampler && (
        <Pin
          x={pinPosition.x}
          y={pinPosition.y}
          heightSampler={heightSampler}
          color="#ff4444"
          // radius={2}
        />
      )}
      <OrbitControls />
    </Canvas>
  )
}
