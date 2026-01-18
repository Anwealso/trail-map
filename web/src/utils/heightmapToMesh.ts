import * as THREE from 'three'

import { Point } from './Point'
import { Coordinate } from './Coordinate'
import {
  TOPOMAP_WORLD_SIZE_X,
  TOPOMAP_WORLD_SIZE_Y,
  TOPOMAP_WORLD_SIZE_Z,
  WORLD_TO_GAME_HEIGHT_SCALE_RATIO,
  // GAMEWORLD_RESOLUTION,
  // TOPOMAP_GAME_SIZE_LIMIT_X,
  // TOPOMAP_GAME_SIZE_LIMIT_Y,
} from './constants'



export interface HeightmapOptions {
  width?: number
  depth?: number
  heightScale?: number
  segmentsX?: number
  segmentsZ?: number
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
  data: Float32Array,
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

  const v00 = data[y0 * imgWidth + x0]
  const v10 = data[y0 * imgWidth + x1]
  const v01 = data[y1 * imgWidth + x0]
  const v11 = data[y1 * imgWidth + x1]

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
 * @returns A 2D array of Point objects where [row][col] corresponds to [y][x] in the image
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
      const normalizedHeight = imageData.data[idx] / 255 // normalize the B/W value to a 
        // float between 0 and 1

      const worldX = (ix / imgWidth) * TOPOMAP_WORLD_SIZE_X
      const worldY = (iy / imgHeight) * TOPOMAP_WORLD_SIZE_Y
      const worldZ = normalizedHeight * TOPOMAP_WORLD_SIZE_Z

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
}

/**
 * Creates a TerrainHeightSampler from ImageData.
 * This is a helper function that can be used when you already have ImageData.
 */
export function createTerrainHeightSamplerFromImageData(
  imageData: ImageData
): TerrainHeightSampler {
  const pointMatrix = createPointMatrixFromHeightmap(imageData)
  const imgWidth = imageData.width
  const imgHeight = imageData.height

  /**
   * Samples the terrain height at a given coordinate using bilinear interpolation with smooth blending.
   * 
   * Think of the heightmap as a grid of height values (like a checkerboard where each square has a height).
   * When you ask for the height at any point between those grid squares, this function finds the 4 nearest
   * grid points that form a square around your position, then smoothly blends between their heights.
   * 
   * The process works in two steps:
   * 1. Horizontal blending: It blends between the two heights along the top edge of the square,
   *    and separately blends between the two heights along the bottom edge.
   * 2. Vertical blending: It then blends between those two resulting heights.
   * 
   * The Hermite fade function ensures the blending is smooth (no sudden jumps) rather than linear,
   * making the terrain transitions appear more natural.
   * 
   * @param coordinate - The coordinate where you want to know the terrain height
   * @returns The interpolated height value in world units
   */
  function sampleWorldHeight(coordinate: Coordinate): number {
    // Coordinate internally stores world coordinates, so we can use worldX and worldY directly
    const worldX = coordinate.worldX
    const worldY = coordinate.worldY

    const u = worldX / TOPOMAP_WORLD_SIZE_X + 0.5
    const v = worldY / TOPOMAP_WORLD_SIZE_Y + 0.5

    const px = u * (imgWidth - 1)
    const py = v * (imgHeight - 1)

    const x0 = Math.floor(px)
    const y0 = Math.floor(py)
    const x1 = Math.min(x0 + 1, imgWidth - 1)
    const y1 = Math.min(y0 + 1, imgHeight - 1)

    const tx = hermiteFade(px - x0)
    const ty = hermiteFade(py - y0)

    const v00 = pointMatrix[y0][x0].worldZ
    const v10 = pointMatrix[y0][x1].worldZ
    const v01 = pointMatrix[y1][x0].worldZ
    const v11 = pointMatrix[y1][x1].worldZ

    const top = lerp(v00, v10, tx)
    const bottom = lerp(v01, v11, tx)

    return lerp(top, bottom, ty)
  }

  return {
    getWorldHeight(coordinate: Coordinate): number {
      return sampleWorldHeight(coordinate)
    },

    getGameHeight(coordinate: Coordinate): number {
      return sampleWorldHeight(coordinate) * WORLD_TO_GAME_HEIGHT_SCALE_RATIO
    },
  }
}

export async function createTerrainHeightSampler(
  heightmapUrl: string
): Promise<TerrainHeightSampler> {
  const imageData = await loadHeightmapImage(heightmapUrl)
  return createTerrainHeightSamplerFromImageData(imageData)
}
