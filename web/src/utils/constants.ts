export const GAMEWORLD_RESOLUTION = 20;

// View dimensions in real-world kilometres
export let TOPOMAP_WORLD_SIZE_X = 10;
export let TOPOMAP_WORLD_SIZE_Y = 10;
export let TOPOMAP_WORLD_SIZE_Z = 0.889;

// The size limits of the heightmap terrain in game units
export const TOPOMAP_GAME_SIZE_LIMIT_X = 10;
export const TOPOMAP_GAME_SIZE_LIMIT_Y = 10;
export const TOPOMAP_GAME_SIZE_LIMIT_Z = 3;

// Scaling factors - these need to be recalculatable
export let WORLD_TO_GAME_SCALE_RATIO = 1.0;
export let WORLD_TO_GAME_HEIGHT_SCALE_RATIO = 1.0;
export let GAME_TO_WORLD_SCALE_RATIO = 1.0;
export let GAME_TO_WORLD_HEIGHT_SCALE_RATIO = 1.0;

export function updateWorldScaling(sizeX: number, sizeY: number, sizeZ: number = 0.889) {
  TOPOMAP_WORLD_SIZE_X = sizeX;
  TOPOMAP_WORLD_SIZE_Y = sizeY;
  TOPOMAP_WORLD_SIZE_Z = sizeZ;

  if (TOPOMAP_WORLD_SIZE_X >= TOPOMAP_WORLD_SIZE_Y) {
    WORLD_TO_GAME_SCALE_RATIO = TOPOMAP_GAME_SIZE_LIMIT_X / TOPOMAP_WORLD_SIZE_X;
  } else {
    WORLD_TO_GAME_SCALE_RATIO = TOPOMAP_GAME_SIZE_LIMIT_Y / TOPOMAP_WORLD_SIZE_Y;
  }

  WORLD_TO_GAME_HEIGHT_SCALE_RATIO = WORLD_TO_GAME_SCALE_RATIO;
  GAME_TO_WORLD_SCALE_RATIO = 1 / WORLD_TO_GAME_SCALE_RATIO;
  GAME_TO_WORLD_HEIGHT_SCALE_RATIO = 1 / WORLD_TO_GAME_SCALE_RATIO;
}

// Initialize with default values
updateWorldScaling(10, 10);

export const GAUSSIAN_ENABLED = true;
export const GAUSSIAN_KERNEL_SIZE = 5;
export const GAUSSIAN_SIGMA = 1.5;

export const MAP_AUTO_ROTATE_ENABLED = false;
