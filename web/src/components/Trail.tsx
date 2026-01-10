import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { 
  loadHeightmapImage, 
} from '../utils/heightmapToMesh'

const TRAIL_HEIGHT_OFFSET = 0
const TRAIL_WIDTH = 5

interface TrailProps {
  csvUrl: string
  heightmapUrl: string
  terrainWidth: number
  terrainDepth: number
  heightScale: number
}

/**
 * Load in trail csv coordinates in world units (world kilometres)
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

function sampleHeightAtGridPoint(
  data: Float32Array,
  imgWidth: number,
  imgHeight: number,
  gridX: number,
  gridY: number
): number {
  const u = gridX / MESH_RESOLUTION
  const v = gridY / MESH_RESOLUTION

  const x = u * (imgWidth - 1)
  const y = v * (imgHeight - 1)

  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(x0 + 1, imgWidth - 1)
  const y1 = Math.min(y0 + 1, imgHeight - 1)

  const tx = hermiteFade(x - x0)
  const ty = hermiteFade(y - y0)

  const v00 = data[y0 * imgWidth + x0]
  const v10 = data[y0 * imgWidth + x1]
  const v01 = data[y1 * imgWidth + x0]
  const v11 = data[y1 * imgWidth + x1]

  const top = lerp(v00, v10, tx)
  const bottom = lerp(v01, v11, tx)

  return lerp(top, bottom, ty)
}

function worldToGrid(worldX: number, worldZ: number, terrainWidth: number, terrainDepth: number): { gridX: number; gridY: number } {
  const u = worldX / terrainWidth + 0.5
  const v = worldZ / terrainDepth + 0.5
  return {
    gridX: Math.round(u * MESH_RESOLUTION),
    gridY: Math.round(v * MESH_RESOLUTION)
  }
}

function gridToWorld(gridX: number, gridY: number, terrainWidth: number, terrainDepth: number): { worldX: number; worldZ: number } {
  const u = gridX / MESH_RESOLUTION
  const v = gridY / MESH_RESOLUTION
  return {
    worldX: (u - 0.5) * terrainWidth,
    worldZ: (v - 0.5) * terrainDepth
  }
}

interface TrailMeshParams {
  curve: THREE.CatmullRomCurve3
  width: number
  heightData: Float32Array
  imgWidth: number
  imgHeight: number
  terrainWidth: number
  terrainDepth: number
  heightScale: number
}

function createTrailMeshGeometry(params: TrailMeshParams): THREE.BufferGeometry {
  const { 
    curve, 
    width, 
    heightData, 
    imgWidth, 
    imgHeight, 
    terrainWidth, 
    terrainDepth, 
    heightScale 
  } = params

  const scaledWidth = width * 0.01
  const gridCellWidth = terrainWidth / MESH_RESOLUTION
  const gridCellDepth = terrainDepth / MESH_RESOLUTION

  const trailGridCells = new Set<string>()
  const curveLength = curve.getLength()
  const sampleStep = Math.min(gridCellWidth, gridCellDepth) * 0.25
  const numSamples = Math.ceil(curveLength / sampleStep)

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples
    const point = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t)
    
    const up = new THREE.Vector3(0, 1, 0)
    const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize()

    const widthSamples = Math.ceil(scaledWidth / Math.min(gridCellWidth, gridCellDepth)) * 2 + 2
    for (let w = 0; w <= widthSamples; w++) {
      const offset = (w / widthSamples - 0.5) * scaledWidth
      const sampleX = point.x + binormal.x * offset
      const sampleZ = point.z + binormal.z * offset

      const u = sampleX / terrainWidth + 0.5
      const v = sampleZ / terrainDepth + 0.5
      const cellX = Math.floor(u * MESH_RESOLUTION)
      const cellY = Math.floor(v * MESH_RESOLUTION)
      
      if (cellX >= 0 && cellX < MESH_RESOLUTION && cellY >= 0 && cellY < MESH_RESOLUTION) {
        trailGridCells.add(`${cellX},${cellY}`)
      }
    }
  }

  const trailGridPoints = new Set<string>()
  trailGridCells.forEach(key => {
    const [cellX, cellY] = key.split(',').map(Number)
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const gx = cellX + dx
        const gy = cellY + dy
        if (gx >= 0 && gx <= MESH_RESOLUTION && gy >= 0 && gy <= MESH_RESOLUTION) {
          trailGridPoints.add(`${gx},${gy}`)
        }
      }
    }
  })

  const gridPointsList: { gridX: number; gridY: number }[] = []
  trailGridPoints.forEach(key => {
    const [gx, gy] = key.split(',').map(Number)
    gridPointsList.push({ gridX: gx, gridY: gy })
  })

  const vertexMap = new Map<string, number>()
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  gridPointsList.forEach(({ gridX, gridY }, index) => {
    const { worldX, worldZ } = gridToWorld(gridX, gridY, terrainWidth, terrainDepth)
    const height = sampleHeightAtGridPoint(heightData, imgWidth, imgHeight, gridX, gridY)
    const worldY = height * heightScale + TRAIL_HEIGHT_OFFSET

    positions.push(worldX, worldY, worldZ)
    uvs.push(gridX / MESH_RESOLUTION, gridY / MESH_RESOLUTION)
    vertexMap.set(`${gridX},${gridY}`, index)
  })

  trailGridCells.forEach(key => {
    const [cellX, cellY] = key.split(',').map(Number)
    
    const tlKey = `${cellX},${cellY}`
    const trKey = `${cellX + 1},${cellY}`
    const blKey = `${cellX},${cellY + 1}`
    const brKey = `${cellX + 1},${cellY + 1}`

    const tlIdx = vertexMap.get(tlKey)
    const trIdx = vertexMap.get(trKey)
    const blIdx = vertexMap.get(blKey)
    const brIdx = vertexMap.get(brKey)

    if (tlIdx !== undefined && trIdx !== undefined && blIdx !== undefined && brIdx !== undefined) {
      indices.push(tlIdx, trIdx, blIdx)
      indices.push(trIdx, brIdx, blIdx)
    }
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  return geometry
}

export function Trail({
  csvUrl,
  heightmapUrl,
  terrainWidth,
  terrainDepth,
  heightScale,
}: TrailProps) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)

  useEffect(() => {
    Promise.all([
      loadTrailCSV(csvUrl),
      loadHeightmapImage(heightmapUrl),
    ]).then(([points, imageData]) => {
      const imgWidth = imageData.width
      const imgHeight = imageData.height

      let heightData = new Float32Array(imgWidth * imgHeight)
      for (let y = 0; y < imgHeight; y++) {
        for (let x = 0; x < imgWidth; x++) {
          const idx = (y * imgWidth + x) * 4
          heightData[y * imgWidth + x] = imageData.data[idx] / 255
        }
      }

      if (GAUSSIAN_ENABLED) {
        heightData = applyGaussianBlur(heightData, imgWidth, imgHeight, GAUSSIAN_KERNEL_SIZE, GAUSSIAN_SIGMA)
      }

      const trailPoints: THREE.Vector3[] = points.map(({ x, y }) => {
        const u = x / 512
        const v = y / 512

        const worldX = (u - 0.5) * terrainWidth
        const worldZ = (v - 0.5) * terrainDepth

        return new THREE.Vector3(worldX, 0, worldZ)
      })

      const curve = new THREE.CatmullRomCurve3(trailPoints, true)
      const trailGeometry = createTrailMeshGeometry({
        curve,
        width: TRAIL_WIDTH,
        heightData,
        imgWidth,
        imgHeight,
        terrainWidth,
        terrainDepth,
        heightScale,
      })
      setGeometry(trailGeometry)
    })
  }, [csvUrl, heightmapUrl, terrainWidth, terrainDepth, heightScale])

  if (!geometry) return null

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="red" side={THREE.DoubleSide} />
    </mesh>
  )
}
