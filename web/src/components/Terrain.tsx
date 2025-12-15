import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { createHeightmapGeometry, loadHeightmapImage } from '../utils/heightmapToMesh'

interface TerrainProps {
  heightmapUrl: string
  width?: number
  depth?: number
  heightScale?: number
}

export function Terrain({ 
  heightmapUrl, 
  width = 10, 
  depth = 10, 
  heightScale = 3,
}: TerrainProps) {
  const [geometry, setGeometry] = useState<THREE.PlaneGeometry | null>(null)

  useEffect(() => {
    loadHeightmapImage(heightmapUrl).then((imageData) => {
      const geo = createHeightmapGeometry(imageData, {
        width,
        depth,
        heightScale,
      })
      setGeometry(geo)
    })
  }, [heightmapUrl, width, depth, heightScale])

  if (!geometry) return null

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial 
        color="#88aa88" 
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
