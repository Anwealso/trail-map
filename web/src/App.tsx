import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Terrain } from './components/Terrain'
import { Trail } from './components/Trail'

const TERRAIN_WIDTH = 10
const TERRAIN_DEPTH = 10
const HEIGHT_SCALE = 3

export default function App() {
  return (
    <Canvas camera={{ position: [8, 8, 8], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <Terrain 
        heightmapUrl="/heightmap.jpg" 
        width={TERRAIN_WIDTH} 
        depth={TERRAIN_DEPTH} 
        heightScale={HEIGHT_SCALE} 
      />
      <Trail
        csvUrl="/trail.csv"
        heightmapUrl="/heightmap.jpg"
        terrainWidth={TERRAIN_WIDTH}
        terrainDepth={TERRAIN_DEPTH}
        heightScale={HEIGHT_SCALE}
      />
      <OrbitControls />
    </Canvas>
  )
}
