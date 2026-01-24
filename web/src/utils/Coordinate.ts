import {
  WORLD_TO_GAME_SCALE_RATIO,
  GAME_TO_WORLD_SCALE_RATIO,
} from "./constants";

/**
 * Represents a 2D coordinate with conversions between real-world and game coordinate systems.
 * Internally stores coordinates in world units.
 *
 * Note: Base assumptions of this class is that the map mesh will be rendered in game to a size
 * of 1 x 1 game unit. The map will be scaled to this size using a "fit inside" strategy, that
 * is the aspect ratio of the original input map will be respected and scaled to the largest size
 * that will fit within the 1x1 game unit area.
 * TODO: Revisit these assumptions later if necessary
 */
export class Coordinate {
  private _worldX: number; // X coordinate in world coords (kms east of 0deg east)
  private _worldY: number; // Y coordinate in world coords (kms north of 0deg north)

  /**
   * Creates a new Point.
   */
  protected constructor(x: number, y: number) {
    this._worldX = x;
    this._worldY = y;
  }

  /** Gets the X coordinate in real-world units. */
  get worldX(): number {
    if (this._worldX === null) {
      throw new Error("X coordinate has not been initialized");
    }
    return this._worldX;
  }

  /** Sets the X coordinate in real-world units. */
  set worldX(value: number) {
    this._worldX = value;
  }

  /** Gets the Y coordinate in real-world units. */
  get worldY(): number {
    if (this._worldY === null) {
      throw new Error("Y coordinate has not been initialized");
    }
    return this._worldY;
  }

  /** Sets the Y coordinate in real-world units. */
  set worldY(value: number) {
    this._worldY = value;
  }

  /** Gets the X coordinate in game units. */
  get gameX(): number {
    if (this._worldX === null) {
      throw new Error("X coordinate has not been initialized");
    }
    return this._worldX * WORLD_TO_GAME_SCALE_RATIO;
  }

  /** Sets the X coordinate from game units. */
  set gameX(value: number) {
    this._worldX = value * GAME_TO_WORLD_SCALE_RATIO;
  }

  /** Gets the Y coordinate in game units. */
  get gameY(): number {
    if (this._worldY === null) {
      throw new Error("Y coordinate has not been initialized");
    }
    return this._worldY * WORLD_TO_GAME_SCALE_RATIO;
  }

  /** Sets the Y coordinate from game units. */
  set gameY(value: number) {
    this._worldY = value * GAME_TO_WORLD_SCALE_RATIO;
  }

  /**
   * Creates a Point from world coordinates.
   */
  static fromWorldCoords(x: number, y: number): Coordinate {
    return new Coordinate(x, y);
  }

  /**
   * Creates a Point from game coordinates.
   */
  static fromGameCoords(x: number, y: number): Coordinate {
    return new Coordinate(
      x * GAME_TO_WORLD_SCALE_RATIO,
      y * GAME_TO_WORLD_SCALE_RATIO,
    );
  }
}
