import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { TerrainHeightSampler } from '../utils/heightmapToMesh'
import { 
  TOPOMAP_GAME_SIZE_LIMIT_X, 
  TOPOMAP_GAME_SIZE_LIMIT_Y,
  TOPOMAP_WORLD_SIZE_X,
  TOPOMAP_WORLD_SIZE_Y
} from '../utils/constants'
import { Coordinate } from '../utils/Coordinate'

const TRAIL_HEIGHT_OFFSET = 0.1
const TRAIL_WIDTH = 0.1 // in game units (kilometers)

/**
 * Load in trail csv coordinates
 * @param url 
 * @returns 
 */
async function loadTrailCSV(url: string): Promise<{ x: number; y: number }[]> {
  const response = await fetch(url)
  const text = await response.text()
  const lines = text.trim().split('\n')
  
  return lines.slice(1).map(line => {
    const [x, y] = line.split(',').map(Number)
    return { x, y }
  })
}

interface TrailMeshParams {
  curve: THREE.CatmullRomCurve3
  width: number
  heightSampler: TerrainHeightSampler
}

function createTrailGeometry(params: TrailMeshParams): THREE.BufferGeometry {
  const { curve, width, heightSampler } = params

  // Create a ribbon-like trail by using a PlaneGeometry and morphing it along the curve
  // Or more simply, use a TubeGeometry and flatten it
  const segments = 200
  const tubeGeometry = new THREE.TubeGeometry(
    curve,
    segments,
    width / 2,
    8, // radialSegments
    false // closed
  )
  const positions = tubeGeometry.attributes.position

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const z = positions.getZ(i)

    // Sample the terrain height at this (x, z) position
    const coordinate = Coordinate.fromGameCoords(x, z)
    const terrainHeight = heightSampler.getGameHeight(coordinate)

    // Set the Y position to terrain height plus offset
    // This effectively flattens the tube onto the terrain surface
    positions.setY(i, terrainHeight + TRAIL_HEIGHT_OFFSET)
  }

  tubeGeometry.computeVertexNormals()
  return tubeGeometry
}

interface TrailProps {
  csvUrl: string
  heightSampler: TerrainHeightSampler
  color: string
}

export function Trail({
  csvUrl,
  heightSampler,
  color = '#eaffdc',
}: TrailProps) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)

  useEffect(() => {
    loadTrailCSV(csvUrl).then((points) => {
      const trailPoints: THREE.Vector3[] = points.map(({ x, y }) => {
        // Map world coordinates (0-10) to game coordinates (-5 to 5)
        const gameX = (x / TOPOMAP_WORLD_SIZE_X - 0.5) * TOPOMAP_GAME_SIZE_LIMIT_X
        const gameZ = (y / TOPOMAP_WORLD_SIZE_Y - 0.5) * TOPOMAP_GAME_SIZE_LIMIT_Y

        return new THREE.Vector3(gameX, 0, gameZ)
      })

      if (trailPoints.length < 2) return

      const curve = new THREE.CatmullRomCurve3(trailPoints, false)
      const trailGeometry = createTrailGeometry({
        curve,
        width: TRAIL_WIDTH,
        heightSampler
      })
      setGeometry(trailGeometry)
    })
  }, [csvUrl, heightSampler])

  if (!geometry) return null

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  )
}
