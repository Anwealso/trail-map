import { TOPOMAP_WORLD_SIZE_X, TOPOMAP_WORLD_SIZE_Y } from "./constants";
import { Coordinate } from "./Coordinate";
import { Point } from "./Point";

/**
 * Interface for sampling terrain height at coordinates.
 * Works with Coordinate objects, supporting both world and game coordinate systems for output.
 */
export interface TerrainSampler {
  /**
   * Returns the 3D point (with height) of the closest vertex in the height mesh to the requested 2D coordinate.
   * Uses a strict subset of the mesh: only returns points that exist in the grid, no interpolation.
   * The coordinate can be set using either world or game coordinates (via Coordinate.worldX/worldY or Coordinate.gameX/gameY).
   * @param coordinate - Coordinate object representing the 2D position
   * @returns The closest Point from the height mesh (worldX, worldY, worldZ)
   */
  getClosestMapPoint: (coordinate: Coordinate) => Point | null;

  /**
   * The matrix of map points to sample from.
   */
  mapPoints: Point[][];
}

/**
 * Creates a TerrainHeightSampler from a 2D matrix of Point objects.
 * @param mapPoints - The 2D array of Point objects representing the terrain
 * @returns A TerrainHeightSampler for the given data
 */
export function createTerrainHeightSamplerFromPointMatrix(
  mapPoints: Point[][],
): TerrainSampler {
  /**
   * Returns the closest point in the height mesh to the requested 2D coordinate.
   * Converts the coordinate to grid indices using the same world-to-grid mapping as the mesh
   * (worldX/Y in [-TOPOMAP_WORLD_SIZE/2, +TOPOMAP_WORLD_SIZE/2] maps to [0, cols-1] and [0, rows-1]),
   * rounds to the nearest cell, and returns that Point (with worldZ). Throws if the coordinate is off-map.
   *
   * @param coordinate - The 2D position (world or game coords via Coordinate)
   * @returns The closest Point from mapPoints (3D: worldX, worldY, worldZ)
   */
  function getClosestMapPoint(coordinate: Coordinate): Point | null {
    const numRows = mapPoints.length;
    const numCols = mapPoints[0]?.length ?? 0;
    if (numRows === 0 || numCols === 0) {
      throw new Error("TerrainHeightSampler: mapPoints is empty");
    }

    const worldX = coordinate.worldX;
    const worldY = coordinate.worldY;

    // Same mapping as createPointMatrixFromHeightmap / resamplePointMatrix (inverse):
    // world = (index / (size-1) - 0.5) * TOPOMAP_WORLD_SIZE  =>  index = (world/TOPOMAP + 0.5) * (size-1)
    const col = Math.round(
      (worldX / TOPOMAP_WORLD_SIZE_X + 0.5) * (numCols - 1),
    );
    const row = Math.round(
      (worldY / TOPOMAP_WORLD_SIZE_Y + 0.5) * (numRows - 1),
    );

    if (col < 0 || col > numCols - 1 || row < 0 || row > numRows - 1) {
      return null;
    }

    return mapPoints[row][col];
  }

  return {
    getClosestMapPoint(coordinate: Coordinate): Point | null {
      return getClosestMapPoint(coordinate);
    },
    mapPoints: mapPoints,
  };
}
