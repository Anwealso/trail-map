import * as THREE from 'three'

import { Point } from './Point'
import { Coordinate } from './Coordinate'
import {
  TOPOMAP_WORLD_SIZE_X,
  TOPOMAP_WORLD_SIZE_Y,
  TOPOMAP_WORLD_SIZE_Z,
  WORLD_TO_GAME_HEIGHT_SCALE_RATIO,
  GAMEWORLD_RESOLUTION,
  TOPOMAP_GAME_SIZE_LIMIT_X,
  TOPOMAP_GAME_SIZE_LIMIT_Y,
  GAUSSIAN_ENABLED,
  GAUSSIAN_KERNEL_SIZE,
  GAUSSIAN_SIGMA
} from './constants'

export interface HeightmapOptions {
  width?: number
  depth?: number
  heightScale?: number
  segmentsX?: number
  segmentsZ?: number
}

function generateGaussianKernel(size: number, sigma: number): Float32Array {
  const kernel = new Float32Array(size * size)
  const center = Math.floor(size / 2)
  let sum = 0

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center
      const dy = y - center
      const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma))
      kernel[y * size + x] = value
      sum += value
    }
  }

  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= sum
  }

  return kernel
}

export function applyGaussianBlur(
  data: Point[][],
  width: number,
  height: number,
  kernelSize: number,
  sigma: number
): Point[][] {
  const kernel = generateGaussianKernel(kernelSize, sigma)
  const result: Point[][] = []
  const halfKernel = Math.floor(kernelSize / 2)

  for (let y = 0; y < height; y++) {
    const row: Point[] = []
    for (let x = 0; x < width; x++) {
      let sum = 0

      for (let ky = 0; ky < kernelSize; ky++) {
        for (let kx = 0; kx < kernelSize; kx++) {
          const sx = Math.min(Math.max(x + kx - halfKernel, 0), width - 1)
          const sy = Math.min(Math.max(y + ky - halfKernel, 0), height - 1)
          sum += data[sy][sx].worldZ * kernel[ky * kernelSize + kx]
        }
      }

      const originalPoint = data[y][x]
      row.push(Point.fromWorldCoords(originalPoint.worldX, originalPoint.worldY, sum))
    }
    result.push(row)
  }

  return result
}

function hermiteFade(t: number): number {
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Samples a height value from the heightmap using bilinear interpolation with Hermite smoothing.
 * @param data - The heightmap data as a flat Float32Array
 * @param imgWidth - Width of the heightmap in pixels
 * @param imgHeight - Height of the heightmap in pixels
 * @param u - Horizontal coordinate in normalized [0, 1] range
 * @param v - Vertical coordinate in normalized [0, 1] range
 * @returns The interpolated height value at the given UV coordinates
 */
export function sampleHeightBilinear(
  data: Point[][],
  imgWidth: number,
  imgHeight: number,
  u: number,
  v: number
): number {
  const x = u * (imgWidth - 1)
  const y = v * (imgHeight - 1)

  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(x0 + 1, imgWidth - 1)
  const y1 = Math.min(y0 + 1, imgHeight - 1)

  const tx = hermiteFade(x - x0)
  const ty = hermiteFade(y - y0)

  const v00 = data[y0][x0].worldZ
  const v10 = data[y0][x1].worldZ
  const v01 = data[y1][x0].worldZ
  const v11 = data[y1][x1].worldZ

  const top = lerp(v00, v10, tx)
  const bottom = lerp(v01, v11, tx)

  return lerp(top, bottom, ty)
}

export async function loadHeightmapImage(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0)
      resolve(ctx.getImageData(0, 0, img.width, img.height))
    }
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}


/**
 * Creates a 2D matrix of Point objects from heightmap image data.
 * Converts pixel coordinates to world coordinates using TOPOMAP_WORLD_SIZE constants.
 * Coordinates are centered at (0, 0) in world space.
 * @param imageData - The heightmap image data
 * @returns A 2D array of Point objects where [row][col] corresponds to [y][x] in the image
 * TODO: In the future this probably doesnt need to be proper Points, it can just be a dumb matrix
 */
export function createPointMatrixFromHeightmap(
  imageData: ImageData,
): Point[][] {
  const imgWidth = imageData.width
  const imgHeight = imageData.height

  const matrix: Point[][] = []

  for (let iy = 0; iy < imgHeight; iy++) {
    const row: Point[] = []
    for (let ix = 0; ix < imgWidth; ix++) {
      const idx = (iy * imgWidth + ix) * 4
      const normalizedHeight = imageData.data[idx] / 255 

      // Center the world coordinates at (0, 0)
      const worldX = (ix / (imgWidth - 1) - 0.5) * TOPOMAP_WORLD_SIZE_X
      const worldY = (iy / (imgHeight - 1) - 0.5) * TOPOMAP_WORLD_SIZE_Y
      const worldZ = normalizedHeight * TOPOMAP_WORLD_SIZE_Z

      row.push(Point.fromWorldCoords(worldX, worldY, worldZ))
    }
    matrix.push(row)
  }

  return matrix
}

/**
 * Resamples a point matrix to a new resolution using bilinear interpolation.
 * @param data - The original point matrix
 * @param targetWidth - Desired number of points horizontally
 * @param targetHeight - Desired number of points vertically
 * @returns A new point matrix at the target resolution
 */
export function resamplePointMatrix(
  data: Point[][],
  targetWidth: number,
  targetHeight: number
): Point[][] {
  const imgHeight = data.length
  const imgWidth = data[0]?.length || 0
  const matrix: Point[][] = []

  for (let iy = 0; iy < targetHeight; iy++) {
    const row: Point[] = []
    for (let ix = 0; ix < targetWidth; ix++) {
      const u = ix / (targetWidth - 1)
      const v = iy / (targetHeight - 1)

      const worldX = (u - 0.5) * TOPOMAP_WORLD_SIZE_X
      const worldY = (v - 0.5) * TOPOMAP_WORLD_SIZE_Y
      
      const worldZ = sampleHeightBilinear(data, imgWidth, imgHeight, u, v)
      row.push(Point.fromWorldCoords(worldX, worldY, worldZ))
    }
    matrix.push(row)
  }
  return matrix
}

/**
 * Interface for sampling terrain height at coordinates.
 * Works with Coordinate objects, supporting both world and game coordinate systems for output.
 */
export interface TerrainHeightSampler {
  /**
   * Gets the interpolated terrain height at the given coordinate.
   * The coordinate can be set using either world or game coordinates (via Coordinate.worldX/worldY or Coordinate.gameX/gameY).
   * @param coordinate - Coordinate object representing the position
   * @returns The terrain height in world units
   */
  getWorldHeight: (coordinate: Coordinate) => number

  /**
   * Gets the interpolated terrain height at the given coordinate.
   * The coordinate can be set using either world or game coordinates (via Coordinate.worldX/worldY or Coordinate.gameX/gameY).
   * @param coordinate - Coordinate object representing the position
   * @returns The terrain height in game units
   */
  getGameHeight: (coordinate: Coordinate) => number

  /**
   * The underlying point matrix used for sampling.
   */
  pointMatrix: Point[][]
}

// TODO: Rework the "sampler" could find the 3D point and height of the closest rounded 
// point in the heightmesh to the requested 2D coord (since we are doing our new strict 
// subset of height mesh strategy).

/**
 * Creates a TerrainHeightSampler from a 2D matrix of Point objects.
 * @param data - The 2D array of Point objects representing the terrain
 * @returns A TerrainHeightSampler for the given data
 * 
 * TODO: Hmmm theisfunciton doenst make much senese to me, disable it for now
*/
// export function createTerrainHeightSamplerFromPointMatrix(
//   data: Point[][]
// ): TerrainHeightSampler {
//   const imgHeight = data.length
//   const imgWidth = data[0]?.length || 0

//   /**
//    * Samples the terrain height at a given coordinate using bilinear interpolation with smooth blending.
//    * 
//    * Think of the heightmap as a grid of height values (like a checkerboard where each square has a height).
//    * When you ask for the height at any point between those grid squares, this function finds the 4 nearest
//    * grid points that form a square around your position, then smoothly blends between their heights.
//    * 
//    * The process works in two steps:
//    * 1. Horizontal blending: It blends between the two heights along the top edge of the square,
//    *    and separately blends between the two heights along the bottom edge.
//    * 2. Vertical blending: It then blends between those two resulting heights.
//    * 
//    * The Hermite fade function ensures the blending is smooth (no sudden jumps) rather than linear,
//    * making the terrain transitions appear more natural.
//    * 
//    * @param coordinate - The coordinate where you want to know the terrain height
//    * @returns The interpolated height value in world units
//    */
//   function sampleWorldHeight(coordinate: Coordinate): number {
//     // Coordinate internally stores world coordinates, so we can use worldX and worldY directly
//     const worldX = coordinate.worldX
//     const worldY = coordinate.worldY

//     const u = worldX / TOPOMAP_WORLD_SIZE_X + 0.5
//     const v = worldY / TOPOMAP_WORLD_SIZE_Y + 0.5

//     return sampleHeightBilinear(data, imgWidth, imgHeight, u, v)
//   }

//   return {
//     getWorldHeight(coordinate: Coordinate): number {
//       return sampleWorldHeight(coordinate)
//     },

//     getGameHeight(coordinate: Coordinate): number {
//       return sampleWorldHeight(coordinate) * WORLD_TO_GAME_HEIGHT_SCALE_RATIO
//     },

//     pointMatrix: data
//   }
// }

// /**
//  * Creates a TerrainHeightSampler from ImageData.
//  * This is a helper function that can be used when you already have ImageData.
//  * Upsamples the raw image data to match the target game resolution and applies 
//  * Gaussian smoothing if enabled.
//  */
// export function createTerrainHeightSamplerFromImageData(
//   imageData: ImageData
// ): TerrainHeightSampler {
//   const pointMatrixRaw = createPointMatrixFromHeightmap(imageData)
  
//   // Up the resolution using bilinear interpolation to match the target mesh resolution
//   // This ensures that subsequent operations (like Gaussian blur) work on high-res data
//   const targetWidth = Math.ceil(GAMEWORLD_RESOLUTION * TOPOMAP_GAME_SIZE_LIMIT_X)
//   const targetHeight = Math.ceil(GAMEWORLD_RESOLUTION * TOPOMAP_GAME_SIZE_LIMIT_Y)
  
//   let pointMatrix = resamplePointMatrix(pointMatrixRaw, targetWidth, targetHeight)
  
//   if (GAUSSIAN_ENABLED) {
//     pointMatrix = applyGaussianBlur(
//       pointMatrix, 
//       targetWidth, 
//       targetHeight, 
//       GAUSSIAN_KERNEL_SIZE, 
//       GAUSSIAN_SIGMA
//     )
//   }

//   return createTerrainHeightSamplerFromPointMatrix(pointMatrix)
// }

// export async function createTerrainHeightSampler(
//   heightmapUrl: string
// ): Promise<TerrainHeightSampler> {
//   const imageData = await loadHeightmapImage(heightmapUrl)
//   return createTerrainHeightSamplerFromImageData(imageData)
// }

/**
 * Creates a Three.js PlaneGeometry from heightmap image data using TerrainHeightSampler.
 * The geometry is sized to match the game world dimensions (1x1 game units) and uses
 * GAMEWORLD_RESOLUTION to determine the mesh density.
 * 
 * @param sampler - The terrain height sampler containing the point matrix
 * @returns A Three.js PlaneGeometry with heights sampled from the terrain heightmap
 */
export async function getFinalMapMeshPointMatrix(
  imageUrl: string
): Promise<Point[][]> {
  const imageData = await loadHeightmapImage(imageUrl)
  const pointMatrixRaw = createPointMatrixFromHeightmap(imageData)
  
  // Up the resolution using bilinear interpolation to reach the final mesh resolution
  const targetWidth = Math.ceil(GAMEWORLD_RESOLUTION * TOPOMAP_GAME_SIZE_LIMIT_X)
  const targetHeight = Math.ceil(GAMEWORLD_RESOLUTION * TOPOMAP_GAME_SIZE_LIMIT_Y)
  let pointMatrix = resamplePointMatrix(pointMatrixRaw, targetWidth, targetHeight)
  
  if (GAUSSIAN_ENABLED) {
    pointMatrix = applyGaussianBlur(
      pointMatrix, 
      targetWidth, 
      targetHeight, 
      GAUSSIAN_KERNEL_SIZE, 
      GAUSSIAN_SIGMA
    )
  }

  return pointMatrix
}

/**
 * Creates a Three.js PlaneGeometry from heightmap image data using TerrainHeightSampler.
 * The geometry is sized to match the game world dimensions (1x1 game units) and uses
 * GAMEWORLD_RESOLUTION to determine the mesh density.
 * 
 * @param mapPoints - The final map mesh point matrix
 * @returns A Three.js PlaneGeometry with heights sampled from the terrain heightmap
 */
export function createHeightmapGeometry(
  mapPoints: Point[][]
): THREE.BufferGeometry {
  // The mesh resolution matches the resampled matrix
  const segmentsX = mapPoints[0].length - 1
  const segmentsZ = mapPoints.length - 1

  // Create the plane geometry with the calculated resolution
  const geometry = new THREE.PlaneGeometry(
    TOPOMAP_GAME_SIZE_LIMIT_X, 
    TOPOMAP_GAME_SIZE_LIMIT_Y, 
    segmentsX, 
    segmentsZ
  )
  geometry.rotateX(-Math.PI / 2)
  const positions = geometry.attributes.position

  // Map the resampled points directly to mesh vertices
  for (let iy = 0; iy < segmentsZ+1; iy++) {
    for (let ix = 0; ix < segmentsX+1; ix++) {
      const i = iy * (segmentsX+1) + ix
      const point = mapPoints[iy][ix]
      positions.setY(i, point.worldZ * WORLD_TO_GAME_HEIGHT_SCALE_RATIO)
    }
  }

  geometry.computeVertexNormals()
  return geometry
}
export { Point }

