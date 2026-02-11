export const GAMEWORLD_RESOLUTION = 100; // the number of points in our mesh per gameworld 1 "metre" unit

// TODO: This should be passed in as an arg later but for now lets hardcode a 10km x 10km size
// for our starter heightmap.jpg map here
export const TOPOMAP_WORLD_SIZE_X = 10; // world units (kilometres)
export const TOPOMAP_WORLD_SIZE_Y = 10; // world units (kilometres)
export const TOPOMAP_WORLD_SIZE_Z = 10; // world units (kilometres)

// The size limits of the heightmap terrain in game units (will be scaled to fit within these limits)
export const TOPOMAP_GAME_SIZE_LIMIT_X = 10; // game units
export const TOPOMAP_GAME_SIZE_LIMIT_Y = 10; // game units
export const TOPOMAP_GAME_SIZE_LIMIT_Z = 3; // game units

// Get the scaling factor for units from world to game and vice versa
// First check which dimension is the limiting factor
let world_to_game_scale_ratio: number;
if (TOPOMAP_WORLD_SIZE_X >= TOPOMAP_WORLD_SIZE_Y) {
  // Width (X size) is the limiting factor
  world_to_game_scale_ratio = TOPOMAP_GAME_SIZE_LIMIT_X / TOPOMAP_WORLD_SIZE_X;
} else {
  // Height (y size) is the limiting factor
  world_to_game_scale_ratio = TOPOMAP_GAME_SIZE_LIMIT_Y / TOPOMAP_WORLD_SIZE_Y;
}
export const WORLD_TO_GAME_SCALE_RATIO = world_to_game_scale_ratio;
export const WORLD_TO_GAME_HEIGHT_SCALE_RATIO =
  TOPOMAP_GAME_SIZE_LIMIT_Z / TOPOMAP_WORLD_SIZE_Z;
export const GAME_TO_WORLD_SCALE_RATIO = 1 / world_to_game_scale_ratio;
export const GAME_TO_WORLD_HEIGHT_SCALE_RATIO =
  TOPOMAP_WORLD_SIZE_Z / TOPOMAP_GAME_SIZE_LIMIT_Z;

export const GAUSSIAN_ENABLED = true;
export const GAUSSIAN_KERNEL_SIZE = 5;
export const GAUSSIAN_SIGMA = 1.5;

export const MAP_AUTO_ROTATE_ENABLED = false;
