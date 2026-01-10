import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { TerrainHeightSampler } from '../utils/heightmapToMesh'
import { Point } from '../utils/Point'
import { Coordinate } from '../utils/Coordinate'
import { TOPOMAP_GAME_SIZE_LIMIT_X, TOPOMAP_GAME_SIZE_LIMIT_Y } from '../utils/constants'

interface PinProps {
  x: number // Normalized X coordinate (0-1 range, 0.5 is center)
  y: number // Normalized Y coordinate (0-1 range, 0.5 is center)
  heightSampler: TerrainHeightSampler
  color?: string
  radius?: number
}

export function Pin({
  x,
  y,
  heightSampler,
  color = '#ff0000',
  radius = 0.1,
}: PinProps) {
  const [position, setPosition] = useState<THREE.Vector3 | null>(null)

  useEffect(() => {
    // Convert normalized coordinates (0-1, with 0.5 as center) to game coordinates
    const gameX = (x - 0.5) * TOPOMAP_GAME_SIZE_LIMIT_X
    const gameY = (y - 0.5) * TOPOMAP_GAME_SIZE_LIMIT_Y

    // Create a coordinate from game coordinates and sample the height
    const coordinate = Coordinate.fromGameCoords(gameX, gameY)
    const gameHeight = heightSampler.getGameHeight(coordinate)

    // Create a Point with the sampled height (Point z is vertical height)
    const point = Point.fromGameCoords(gameX, gameY, gameHeight)

    // Convert Point coordinates to Three.js axes:
    // - gameX (horizontal) -> Three.js X
    // - gameY (depth) -> Three.js Z
    // - gameZ (height) -> Three.js Y
    const threeX = point.gameX
    const threeY = point.gameZ + radius * 2 // Add pin offset (radius * 2 for height)
    const threeZ = point.gameY // Note: gameY maps to Three.js Z (depth axis)

    setPosition(new THREE.Vector3(threeX, threeY, threeZ))
  }, [x, y, heightSampler, radius])

  if (!position) return null

  return (
    <mesh position={position} rotation={[Math.PI, 0, 0]}>
      <coneGeometry args={[radius, radius * 2, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
