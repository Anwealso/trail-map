import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { createTerrainHeightSampler } from '../utils/heightmapToMesh'

interface PinProps {
  x: number
  y: number
  heightmapUrl: string
  terrainWidth: number
  terrainDepth: number
  heightScale: number
  color?: string
  radius?: number
}

export function Pin({
  x,
  y,
  heightmapUrl,
  terrainWidth,
  terrainDepth,
  heightScale,
  color = '#ff0000',
  radius = 0.1,
}: PinProps) {
  const [position, setPosition] = useState<THREE.Vector3 | null>(null)

  useEffect(() => {
    createTerrainHeightSampler(heightmapUrl, terrainWidth, terrainDepth, heightScale).then(
      (sampler) => {
        const worldX = (x - 0.5) * terrainWidth
        const worldZ = (y - 0.5) * terrainDepth
        const worldY = sampler.getHeight(worldX, worldZ)

        setPosition(new THREE.Vector3(worldX, worldY + radius * 2, worldZ))
      }
    )
  }, [x, y, heightmapUrl, terrainWidth, terrainDepth, heightScale, radius])

  if (!position) return null

  return (
    <mesh position={position} rotation={[Math.PI, 0, 0]}>
      <coneGeometry args={[radius, radius * 2, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
