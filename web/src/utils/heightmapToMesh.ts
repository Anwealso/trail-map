import * as THREE from 'three'

export const MESH_RESOLUTION = 1024

export const GAUSSIAN_ENABLED = true
export const GAUSSIAN_KERNEL_SIZE = 5
export const GAUSSIAN_SIGMA = 1.5

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
  data: Float32Array,
  width: number,
  height: number,
  kernelSize: number,
  sigma: number
): Float32Array {
  const kernel = generateGaussianKernel(kernelSize, sigma)
  const result = new Float32Array(data.length)
  const halfKernel = Math.floor(kernelSize / 2)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0

      for (let ky = 0; ky < kernelSize; ky++) {
        for (let kx = 0; kx < kernelSize; kx++) {
          const sx = Math.min(Math.max(x + kx - halfKernel, 0), width - 1)
          const sy = Math.min(Math.max(y + ky - halfKernel, 0), height - 1)
          sum += data[sy * width + sx] * kernel[ky * kernelSize + kx]
        }
      }

      result[y * width + x] = sum
    }
  }

  return result
}

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

function sampleHeightBilinear(
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

export function createHeightmapGeometry(
  imageData: ImageData,
  options: HeightmapOptions = {}
): THREE.PlaneGeometry {
  const {
    width = 10,
    depth = 10,
    heightScale = 2,
    segmentsX = MESH_RESOLUTION,
    segmentsZ = MESH_RESOLUTION,
  } = options

  const geometry = new THREE.PlaneGeometry(width, depth, segmentsX, segmentsZ)
  geometry.rotateX(-Math.PI / 2)

  const positions = geometry.attributes.position
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

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const z = positions.getZ(i)

    const u = x / width + 0.5
    const v = z / depth + 0.5

    const height = sampleHeightBilinear(heightData, imgWidth, imgHeight, u, v)
    positions.setY(i, height * heightScale)
  }

  geometry.computeVertexNormals()
  return geometry
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

export async function createHeightmapMesh(
  imageUrl: string,
  options: HeightmapOptions = {},
  material?: THREE.Material
): Promise<THREE.Mesh> {
  const imageData = await loadHeightmapImage(imageUrl)
  const geometry = createHeightmapGeometry(imageData, options)
  const mat = material ?? new THREE.MeshStandardMaterial({
    color: 0x88aa88,
    wireframe: false,
    flatShading: false,
  })
  return new THREE.Mesh(geometry, mat)
}
