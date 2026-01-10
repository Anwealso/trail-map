import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { TerrainHeightSampler } from '../utils/heightmapToMesh'
import { Point } from '../utils/Point'
import { Coordinate } from '../utils/Coordinate'

interface PinProps {
  x: number // X coordinate in world coordinates
  y: number // Y coordinate in world coordinates
  heightSampler: TerrainHeightSampler
  color?: string
  radius?: number
}

// TODO: check through this to see that it is actualy using world coordinates properly here
export function Pin({
  x,
  y,
  heightSampler,
  color = '#d83d28',
  radius = 0.1, // radius in game units
}: PinProps) {
  const [position, setPosition] = useState<THREE.Vector3 | null>(null)
  const [height, setHeight] = useState<number>(radius * 2)

  useEffect(() => {
    // // Convert normalized coordinates (0-1, with 0.5 as center) to game coordinates
    // const gameX = (x - 0.5) * TOPOMAP_GAME_SIZE_LIMIT_X
    // const gameY = (y - 0.5) * TOPOMAP_GAME_SIZE_LIMIT_Y

    // Create a coordinate from game coordinates and sample the height
    const coordinate = Coordinate.fromWorldCoords(x, y)
    console.log({coordinate});
    const worldHeight = heightSampler.getWorldHeight(coordinate)

    // Create a Point with the sampled height (Point z is vertical height)
    const point = Point.fromWorldCoords(x, y, worldHeight)

    // Convert Point coordinates to Three.js axes:
    // - gameX (horizontal) -> Three.js X
    // - gameY (depth) -> Three.js Z
    // - gameZ (height) -> Three.js Y
    const threeX = point.gameX
    const threeY = point.gameZ + height/2 // Add pin offset for height
    const threeZ = point.gameY // Note: gameY maps to Three.js Z (depth axis)

    setPosition(new THREE.Vector3(threeX, threeY, threeZ))
  }, [x, y, heightSampler, radius])

  if (!position) return null

  // Calculate sphere radius that fits inside cone
  const coneAngle = Math.atan(radius / height)
  const sphereRadius = radius / Math.cos(coneAngle)
  const sphereOffset = height/2 + (sphereRadius * Math.sin(coneAngle))

  return (
    <group position={position}>
      {/* Cone pin */}
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[radius, height, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Sphere that fits inside cone */}
      <mesh position={[0, sphereOffset, 0]}>
        <sphereGeometry args={[sphereRadius, 16, 16, 0, 2*Math.PI, 0, (Math.PI-coneAngle)]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}
