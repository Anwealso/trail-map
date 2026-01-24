import {
  WORLD_TO_GAME_HEIGHT_SCALE_RATIO,
  GAME_TO_WORLD_HEIGHT_SCALE_RATIO,
  GAME_TO_WORLD_SCALE_RATIO,
} from "./constants";
import { Coordinate } from "./Coordinate";

/**
 * Represents a 3D point with X, Y coordinates (via Coordinate) plus a height/Z component.
 * Internally stores all values in world units.
 */
// @ts-expect-error - Static methods have different signatures (3D vs 2D) which is intentional
export class Point extends Coordinate {
  private _worldZ: number; // Z/height coordinate in world units (kilometres)

  protected constructor(x: number, y: number, z: number) {
    super(x, y);
    this._worldZ = z;
  }

  /** Gets the Z/height coordinate in real-world units. */
  get worldZ(): number {
    return this._worldZ;
  }

  /** Sets the Z/height coordinate in real-world units. */
  set worldZ(value: number) {
    this._worldZ = value;
  }

  /** Gets the Z/height coordinate in game units. */
  get gameZ(): number {
    return this._worldZ * WORLD_TO_GAME_HEIGHT_SCALE_RATIO;
  }

  /** Sets the Z/height coordinate from game units. */
  set gameZ(value: number) {
    this._worldZ = value * GAME_TO_WORLD_HEIGHT_SCALE_RATIO;
  }

  /**
   * Gets the X/"distance right in the screen plane" coordinate in game units in
   * threejs render axes.
   */
  get threeX(): number {
    return this.gameX;
  }

  /**
   * Gets the Y/"distance up in the screen plane" coordinate in game units in
   * threejs render axes.
   */
  get threeY(): number {
    return this.gameZ;
  }

  /**
   * Gets the Z/"depth into the screen" coordinate in game units in threejs
   * render axes.
   */
  get threeZ(): number {
    return this.gameY;
  }

  /**
   * Creates a Point from world coordinates.
   */
  static fromWorldCoords(x: number, y: number, z: number): Point {
    return new Point(x, y, z);
  }

  /**
   * Creates a Point from game coordinates.
   */
  static fromGameCoords(x: number, y: number, z: number): Point {
    return new Point(
      x * GAME_TO_WORLD_SCALE_RATIO,
      y * GAME_TO_WORLD_SCALE_RATIO,
      z * GAME_TO_WORLD_HEIGHT_SCALE_RATIO,
    );
  }
}
