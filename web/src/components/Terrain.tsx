import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { createHeightmapGeometry, Point } from '../utils/heightmapToMesh'

interface TerrainProps {
  mapPoints: Point[][]
  material?: THREE.Material
}

export function Terrain({ 
  mapPoints,
  material
}: TerrainProps) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)
  const mat = material ?? new THREE.MeshStandardMaterial({
    color: 0xb0e67e,
    wireframe: false,
    flatShading: false,
    side: THREE.DoubleSide
  })

  useEffect(() => {
      setGeometry(createHeightmapGeometry(mapPoints))
  }, [mapPoints])

  if (!geometry) return null

  return (
    <mesh geometry={geometry} material={mat}/>
  )
}
