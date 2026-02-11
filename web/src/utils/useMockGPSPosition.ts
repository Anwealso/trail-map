import { useState, useCallback, useRef } from "react";
import { GPSPosition } from "./gpsUtils";
import { TOPOMAP_WORLD_SIZE_X, TOPOMAP_WORLD_SIZE_Y } from "./constants";

// Approximate meters per degree at equator
const METERS_PER_DEGREE_LAT = 111320;
const METERS_PER_DEGREE_LNG_AT_EQUATOR = 111320;

export interface MapPosition {
  x: number; // World X coordinate (0 to TOPOMAP_WORLD_SIZE_X)
  y: number; // World Y coordinate (0 to TOPOMAP_WORLD_SIZE_Y)
}

export interface MockGPSOptions {
  /** Distance in meters that should span the full map width (default: 10) */
  realWorldSpanMeters?: number;
  /** Initial latitude (default: -27.4698, Brisbane) */
  initialLatitude?: number;
  /** Initial longitude (default: 153.0251, Brisbane) */
  initialLongitude?: number;
}

/**
 * Hook that manages GPS-to-map position translation.
 * 
 * The first GPS reading establishes the reference point (mapped to map center).
 * Subsequent movements are translated relative to this point, scaled so that
 * realWorldSpanMeters of real-world movement spans the full map width.
 */
export function useMockGPSPosition(options: MockGPSOptions = {}) {
  const {
    realWorldSpanMeters = 10,
    initialLatitude = -27.4698,
    initialLongitude = 153.0251,
  } = options;

  const referenceRef = useRef<GPSPosition | null>(null);
  const [mapPosition, setMapPosition] = useState<MapPosition>({
    x: TOPOMAP_WORLD_SIZE_X / 2,
    y: TOPOMAP_WORLD_SIZE_Y / 2,
  });
  // Mark as used to avoid LSP warnings - these are for future expansion
  void initialLatitude;
  void initialLongitude;

  /**
   * Update position from a GPS reading.
   * First call establishes the reference point at map center.
   * Subsequent calls calculate delta and scale to map coordinates.
   */
  const updateFromGPS = useCallback(
    (gpsPos: GPSPosition) => {
      if (!referenceRef.current) {
        // First reading: establish reference at map center
        referenceRef.current = { ...gpsPos };
        setMapPosition({
          x: TOPOMAP_WORLD_SIZE_X / 2,
          y: TOPOMAP_WORLD_SIZE_Y / 2,
        });
        return;
      }

      const ref = referenceRef.current;

      // Calculate delta in degrees
      const deltaLat = gpsPos.latitude - ref.latitude;
      const deltaLng = gpsPos.longitude - ref.longitude;

      // Convert to meters (approximate)
      // Adjust longitude meters based on latitude (cosine factor)
      const metersPerDegreeLng =
        METERS_PER_DEGREE_LNG_AT_EQUATOR *
        Math.cos((ref.latitude * Math.PI) / 180);

      const deltaXMeters = deltaLng * metersPerDegreeLng;
      const deltaYMeters = deltaLat * METERS_PER_DEGREE_LAT;

      // Scale: realWorldSpanMeters meters = full map width
      // X increases east, Y increases north (matching world coordinates)
      const scaleX = TOPOMAP_WORLD_SIZE_X / realWorldSpanMeters;
      const scaleY = TOPOMAP_WORLD_SIZE_Y / realWorldSpanMeters;

      const newX = TOPOMAP_WORLD_SIZE_X / 2 + deltaXMeters * scaleX;
      const newY = TOPOMAP_WORLD_SIZE_Y / 2 + deltaYMeters * scaleY;

      // Clamp to map bounds
      const clampedX = Math.max(0, Math.min(TOPOMAP_WORLD_SIZE_X, newX));
      const clampedY = Math.max(0, Math.min(TOPOMAP_WORLD_SIZE_Y, newY));

      setMapPosition({ x: clampedX, y: clampedY });
    },
    [realWorldSpanMeters]
  );

  /**
   * Reset the reference point. Next GPS reading will become the new center.
   */
  const resetReference = useCallback(() => {
    referenceRef.current = null;
  }, []);

  /**
   * Get the current reference point (null if not set yet)
   */
  const getReference = useCallback(() => {
    return referenceRef.current;
  }, []);

  return {
    mapPosition,
    updateFromGPS,
    resetReference,
    getReference,
    isInitialized: referenceRef.current !== null,
  };
}

/**
 * Create a mock GPS position provider that simulates movement.
 * Useful for testing without real GPS.
 */
export function createMockGPSProvider(options: MockGPSOptions & {
  simulateMovement?: boolean;
  movementSpeedMetersPerSecond?: number;
} = {}) {
  const {
    initialLatitude = -27.4698,
    initialLongitude = 153.0251,
    simulateMovement = false,
    movementSpeedMetersPerSecond = 1,
  } = options;

  let currentLat = initialLatitude;
  let currentLng = initialLongitude;
  let intervalId: number | null = null;
  let angle = 0;



  return {
    /**
     * Get current mock GPS position
     */
    getPosition(): GPSPosition {
      return { latitude: currentLat, longitude: currentLng };
    },

    /**
     * Start simulating movement in a circle
     */
    startMovement(callback: (pos: GPSPosition) => void): () => void {
      if (!simulateMovement) {
        callback(this.getPosition());
        return () => {};
      }

      const radiusMeters = 5; // 5m radius circle
      const updateInterval = 100; // 100ms updates

      intervalId = window.setInterval(() => {
        // Calculate position on circle
        angle += (movementSpeedMetersPerSecond * updateInterval / 1000) / radiusMeters;

        // Calculate degree deltas for this step
        const latDelta = (movementSpeedMetersPerSecond * updateInterval / 1000 / METERS_PER_DEGREE_LAT) * Math.sin(angle);
        currentLat += latDelta;
        currentLng += (movementSpeedMetersPerSecond * updateInterval / 1000 / (METERS_PER_DEGREE_LNG_AT_EQUATOR * Math.cos((currentLat * Math.PI) / 180))) * Math.cos(angle);

        callback(this.getPosition());
      }, updateInterval);

      return () => {
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
      };
    },

    /**
     * Manually set position
     */
    setPosition(lat: number, lng: number) {
      currentLat = lat;
      currentLng = lng;
    },

    /**
     * Stop movement simulation
     */
    stopMovement() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  };
}
