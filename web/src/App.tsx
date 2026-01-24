import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Terrain } from './components/Terrain'
import { Trail } from './components/Trail'
import { Pin } from './components/Pin'
import { getFinalMapMeshPointMatrix, TerrainHeightSampler, Point } from './utils/heightmapToMesh'

export default function App() {
  const [pinPosition, setPinPosition] = useState({ x: -2, y: 3 }) // world coordinates in kilometers
  const [heightSampler, setHeightSampler] = useState<TerrainHeightSampler | null>(null)
  const [mapPoints, setMapPoints] = useState<Point[][] | null>(null)

  useEffect(() => {
      getFinalMapMeshPointMatrix('/heightmap.jpg').then((points) => {
      setMapPoints(points)
    })
  }, [])

  return (
    <Canvas camera={{ position: [8, 8, 8], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <axesHelper args={[2]} />
      {mapPoints && (
        <Terrain
          mapPoints={mapPoints}
        />
      )}
      {/* {mapPoints && (
        <Trail
          csvUrl="/trail.csv"
          heightSampler={heightSampler}
          color={'#eaffdc'}s
        />
      )} */}
      {/* {mapPoints && (
        <Pin
          x={pinPosition.x}
          y={pinPosition.y}
          heightSampler={heightSampler}
          color="#ff4444"
          radius={0.2}
        />
      )} */}
      <OrbitControls />
    </Canvas>
  )
}
