import { Point } from './Point'
import {
  TOPOMAP_WORLD_SIZE_X,
  TOPOMAP_WORLD_SIZE_Y,
  TOPOMAP_WORLD_SIZE_Z,
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
 * @param imageData - The heightmap image data
 * @param uCenter - Center of the window in UV space (0-1)
 * @param vCenter - Center of the window in UV space (0-1)
 * @param uSpan - Span of the window in U space
 * @param vSpan - Span of the window in V space
 * @returns A 2D array of Point objects where [row][col] corresponds to [y][x] in the image
 */
export function createPointMatrixFromHeightmap(
  imageData: ImageData,
  uCenter: number = 0.5,
  vCenter: number = 0.5,
  uSpan: number = 1.0,
  vSpan: number = 1.0,
): Point[][] {
  const imgWidth = imageData.width
  const imgHeight = imageData.height

  const matrix: Point[][] = []

  const uMin = uCenter - uSpan / 2;
  const vMin = vCenter - vSpan / 2;

  for (let iy = 0; iy < imgHeight; iy++) {
    const row: Point[] = []
    for (let ix = 0; ix < imgWidth; ix++) {
      // Current position in the window [0, 1]
      const tu = ix / (imgWidth - 1);
      const tv = iy / (imgHeight - 1);

      // Map window position back to absolute image UV
      const u = uMin + tu * uSpan;
      const v = vMin + tv * vSpan;

      // Clamp UVs to [0, 1] to avoid out of bounds
      const clampedU = Math.max(0, Math.min(1, u));
      const clampedV = Math.max(0, Math.min(1, v));

      const pixX = Math.round(clampedU * (imgWidth - 1));
      const pixY = Math.round(clampedV * (imgHeight - 1));

      const idx = (pixY * imgWidth + pixX) * 4
      const normalizedHeight = imageData.data[idx] / 255 

      // World coordinates for the resulting point matrix
      // These span [0, TOPOMAP_WORLD_SIZE_X/Y]
      const worldX = tu * TOPOMAP_WORLD_SIZE_X;
      const worldY = tv * TOPOMAP_WORLD_SIZE_Y;
      const worldZ = normalizedHeight * TOPOMAP_WORLD_SIZE_Z;

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

      const worldX = u * TOPOMAP_WORLD_SIZE_X;
      const worldY = v * TOPOMAP_WORLD_SIZE_Y;

      const worldZ = sampleHeightBilinear(data, imgWidth, imgHeight, u, v);
      row.push(Point.fromWorldCoords(worldX, worldY, worldZ));
    }
    matrix.push(row)
  }
  return matrix
}

/**
 * Creates a Three.js PlaneGeometry from heightmap image data using TerrainHeightSampler.
 * The geometry is sized to match the game world dimensions (1x1 game units) and uses
 * GAMEWORLD_RESOLUTION to determine the mesh density.
 *
 * @param imageUrl - URL of the heightmap image
 * @param uCenter - Center of the window in UV space (0-1)
 * @param vCenter - Center of the window in UV space (0-1)
 * @param uSpan - Span of the window in U space
 * @param vSpan - Span of the window in V space
 * @returns A 2D array of Point objects where [row][col] corresponds to [y][x] in the image
 */
export async function getFinalMapMeshPointMatrix(
  imageUrl: string,
  uCenter: number = 0.5,
  vCenter: number = 0.5,
  uSpan: number = 1.0,
  vSpan: number = 1.0,
): Promise<Point[][]> {
  const imageData = await loadHeightmapImage(imageUrl)
  const pointMatrixRaw = createPointMatrixFromHeightmap(imageData, uCenter, vCenter, uSpan, vSpan)
  
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
