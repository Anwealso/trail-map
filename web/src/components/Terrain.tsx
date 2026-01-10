import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { TerrainHeightSampler } from '../utils/heightmapToMesh'
import { GAMEWORLD_RESOLUTION, TOPOMAP_GAME_SIZE_LIMIT_X, TOPOMAP_GAME_SIZE_LIMIT_Y } from '../utils/constants'
import { Coordinate } from '../utils/Coordinate'

interface TerrainProps {
  heightSampler: TerrainHeightSampler
}

/**
 * Creates a Three.js PlaneGeometry from heightmap image data using TerrainHeightSampler.
 * The geometry is sized to match the game world dimensions (1x1 game units) and uses
 * GAMEWORLD_RESOLUTION to determine the mesh density.
 * 
 * @param imageData - The heightmap image data
 * @returns A Three.js PlaneGeometry with heights sampled from the terrain heightmap
 */
function createHeightmapGeometry(
  sampler: TerrainHeightSampler
  // options: HeightmapOptions = {}
): THREE.BufferGeometry {
  // The mesh is sized to fit within the TOPOMAP_GAME_SIZE_LIMIT constants size
  // GAMEWORLD_RESOLUTION determines how many segments we have per game unit
  const segmentsX = GAMEWORLD_RESOLUTION * TOPOMAP_GAME_SIZE_LIMIT_X
  const segmentsZ = GAMEWORLD_RESOLUTION * TOPOMAP_GAME_SIZE_LIMIT_Y

  // Create the plane geometry with the calculated resolution
  const geometry = new THREE.PlaneGeometry(TOPOMAP_GAME_SIZE_LIMIT_X, TOPOMAP_GAME_SIZE_LIMIT_Y, segmentsX, segmentsZ)
  geometry.rotateX(-Math.PI / 2)
  const positions = geometry.attributes.position

  // Sample heights at each vertex using game coordinates
  for (let i = 0; i < positions.count; i++) {
    const gameX = positions.getX(i)
    const gameY = positions.getZ(i) // In Three.js, Z is the depth axis after rotation
    // Create a coordinate from game coordinates
    const coordinate = Coordinate.fromGameCoords(gameX, gameY)
    // Sample the height in game units, then apply height scale
    const gameHeight = sampler.getGameHeight(coordinate)
    // Set the Y position (height) in game units
    positions.setY(i, gameHeight)
  }

  geometry.computeVertexNormals()
  return geometry
}

export function Terrain({ 
  heightSampler,
}: TerrainProps) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)

  useEffect(() => {
      const geo = createHeightmapGeometry(heightSampler)
      setGeometry(geo)
  }, [heightSampler, /*heightmapUrl, width, depth, heightScale*/])

  if (!geometry) return null

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial 
        color={"#b0e67e"}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
