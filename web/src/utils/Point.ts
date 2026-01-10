import {
  WORLD_TO_GAME_HEIGHT_SCALE_RATIO,
  GAME_TO_WORLD_HEIGHT_SCALE_RATIO,
} from './constants'
import { Coordinate } from './Coordinate'

/**
 * Represents a 3D point with X, Y coordinates (via Coordinate) plus a height/Z component.
 * Internally stores all values in world units.
 */
export class Point {
  private _coordinate: Coordinate
  private _worldZ: number // Z/height coordinate in world units (kilometres)

  private constructor(coordinate: Coordinate, z: number) {
    this._coordinate = coordinate
    this._worldZ = z
  }

  /** Gets the X coordinate in real-world units. */
  get worldX(): number {
    return this._coordinate.worldX
  }

  /** Sets the X coordinate in real-world units. */
  set worldX(value: number) {
    this._coordinate.worldX = value
  }

  /** Gets the Y coordinate in real-world units. */
  get worldY(): number {
    return this._coordinate.worldY
  }

  /** Sets the Y coordinate in real-world units. */
  set worldY(value: number) {
    this._coordinate.worldY = value
  }

  /** Gets the Z/height coordinate in real-world units. */
  get worldZ(): number {
    return this._worldZ
  }

  /** Sets the Z/height coordinate in real-world units. */
  set worldZ(value: number) {
    this._worldZ = value
  }

  /** Gets the X coordinate in game units. */
  get gameX(): number {
    return this._coordinate.gameX
  }

  /** Sets the X coordinate from game units. */
  set gameX(value: number) {
    this._coordinate.gameX = value
  }

  /** Gets the Y coordinate in game units. */
  get gameY(): number {
    return this._coordinate.gameY
  }

  /** Sets the Y coordinate from game units. */
  set gameY(value: number) {
    this._coordinate.gameY = value
  }

  /** Gets the Z/height coordinate in game units. */
  get gameZ(): number {
    return this._worldZ * WORLD_TO_GAME_HEIGHT_SCALE_RATIO
  }

  /** Sets the Z/height coordinate from game units. */
  set gameZ(value: number) {
    this._worldZ = value * GAME_TO_WORLD_HEIGHT_SCALE_RATIO
  }

  /** Gets the underlying Coordinate (X, Y only). */
  get coordinate(): Coordinate {
    return this._coordinate
  }

  /**
   * Creates a Point from world coordinates.
   */
  static fromWorldCoords(x: number, y: number, z: number): Point {
    return new Point(Coordinate.fromWorldCoords(x, y), z)
  }

  /**
   * Creates a Point from game coordinates.
   */
  static fromGameCoords(x: number, y: number, z: number): Point {
    return new Point(
      Coordinate.fromGameCoords(x, y),
      z * GAME_TO_WORLD_HEIGHT_SCALE_RATIO
    )
  }
}
