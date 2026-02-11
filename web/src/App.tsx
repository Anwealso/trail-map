import { useState, useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Terrain } from "./components/Terrain";
import { useTrailTexture } from "./utils/trailTexture";
import { Pin } from "./components/Pin";
import { Grass } from "./components/Grass";
import { Trees } from "./components/Trees";
import { Lighting } from "./components/Lighting";
import { getFinalMapMeshPointMatrix } from "./utils/heightmapToMesh";
import { GPSPosition } from "./utils/gpsUtils";
import {
  createTerrainHeightSamplerFromPointMatrix,
  TerrainSampler,
} from "./utils/terrainSampler";
import { useMockGPSPosition } from "./utils/useMockGPSPosition";
import {
  TOPOMAP_GAME_SIZE_LIMIT_X,
  TOPOMAP_GAME_SIZE_LIMIT_Y,
  MAP_AUTO_ROTATE_ENABLED,
} from "./utils/constants";
import "./App.css";

export default function App() {
  const [terrainSampler, setterrainSampler] = useState<TerrainSampler | null>(
    null,
  );
  const [autoRotate, setAutoRotate] = useState(MAP_AUTO_ROTATE_ENABLED);
  const autoRotateTimer = useRef<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [gpsPosition, setGpsPosition] = useState<GPSPosition | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isSecure, setIsSecure] = useState(true);
  const watchIdRef = useRef<number | null>(null);

  const trailCsvUrl = `${import.meta.env.BASE_URL}trail_2.csv`;
  const { texture: trailTexture, sampler: trailSampler } = useTrailTexture(trailCsvUrl);

  // GPS-to-map position translation hook
  const { mapPosition, updateFromGPS, isInitialized } = useMockGPSPosition({
    realWorldSpanMeters: 10, // 10m real movement = full map width
  });

  const startGpsWatch = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported");
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos: GPSPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setGpsPosition(pos);
        updateFromGPS(pos);
        setGpsError(null);
        
        watchIdRef.current = navigator.geolocation.watchPosition(
          (watchPos) => {
            const newPos: GPSPosition = {
              latitude: watchPos.coords.latitude,
              longitude: watchPos.coords.longitude,
            };
            setGpsPosition(newPos);
            updateFromGPS(newPos);
          },
          (err) => console.error("Watch error:", err),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      },
      (error) => {
        let message = "GPS Error";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Permission Denied. Check your browser's location settings.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Position Unavailable";
        } else if (error.code === error.TIMEOUT) {
          message = "GPS Timeout";
        }
        setGpsError(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    setIsSecure(window.isSecureContext);
    
    const base = import.meta.env.BASE_URL;
    getFinalMapMeshPointMatrix(`${base}heightmap.jpg`).then((points) => {
      setterrainSampler(createTerrainHeightSamplerFromPointMatrix(points));
    });

    if (!window.isSecureContext) {
      setGpsError("Insecure Context (Requires HTTPS)");
      return;
    }

    startGpsWatch();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (terrainSampler && trailTexture) {
      setLoaded(true);
    }
  }, [terrainSampler, trailTexture]);

  const orbitTarget = useMemo(() => {
    const cx = TOPOMAP_GAME_SIZE_LIMIT_X / 2;
    const cz = TOPOMAP_GAME_SIZE_LIMIT_Y / 2;
    if (!terrainSampler?.mapPoints?.length) return [cx, 0, cz] as const;
    let minY = Infinity;
    for (const row of terrainSampler.mapPoints) {
      for (const p of row) {
        if (p.threeY < minY) minY = p.threeY;
      }
    }
    return [cx, minY === Infinity ? 0 : minY, cz] as const;
  }, [terrainSampler]);

  const handleInteractionStart = () => {
    setAutoRotate(false);
    if (autoRotateTimer.current) {
      window.clearTimeout(autoRotateTimer.current);
    }
  };

  const handleInteractionEnd = () => {
    if (autoRotateTimer.current) {
      window.clearTimeout(autoRotateTimer.current);
    }
    if (!MAP_AUTO_ROTATE_ENABLED) return;
    autoRotateTimer.current = window.setTimeout(() => {
      setAutoRotate(true);
    }, 5000);
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: "10px",
          left: "10px",
          right: "10px",
          color: "black",
          zIndex: 1100,
          fontFamily: "monospace",
          fontSize: "16px",
          fontWeight: "bold",
          textShadow: "1px 1px 2px rgba(255,255,255,0.5)",
          display: "flex",
          flexDirection: "column",
          gap: "5px",
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>
          {!isSecure ? (
            <div
              style={{
                color: "white",
                backgroundColor: "red",
                padding: "10px",
                borderRadius: "5px",
                fontSize: "12px",
                alignSelf: "flex-start",
              }}
            >
              ⚠️ GPS requires HTTPS. The browser will block location on insecure
              connections.
            </div>
          ) : gpsError ? (
            <div style={{ display: "flex", flexDirection: "column", alignSelf: "flex-start" }}>
              <span style={{ color: "#ff4444" }}>Error: {gpsError}</span>
              <button
                onClick={startGpsWatch}
                style={{
                  marginTop: "5px",
                  padding: "4px 8px",
                  fontSize: "12px",
                  cursor: "pointer",
                  backgroundColor: "#808080",
                  border: "none",
                  color: "white",
                  borderRadius: "4px",
                }}
              >
                Retry GPS
              </button>
            </div>
          ) : gpsPosition ? (
            <div>
              <div>Lat: {gpsPosition.latitude.toFixed(6)}, Lng: {gpsPosition.longitude.toFixed(6)}</div>
              <div>Map: ({mapPosition.x.toFixed(2)}, {mapPosition.y.toFixed(2)}) {isInitialized ? "" : "(calibrating...)"}</div>
            </div>
          ) : (
            "Fetching GPS..."
          )}
        </div>
      </div>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "white",
          zIndex: 1000,
          opacity: loaded ? 0 : 1,
          pointerEvents: loaded ? "none" : "auto",
          transition: "opacity 1s ease-out",
        }}
      >
        <div className="loading-container">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      </div>
      <Canvas shadows camera={{ position: [8, 4, 8], fov: 50 }}>
        <Lighting />

        {terrainSampler && (
          <Terrain 
            mapPoints={terrainSampler.mapPoints} 
            trailTexture={trailTexture}
          />
        )}
        {terrainSampler && trailSampler && <Grass terrainSampler={terrainSampler} count={400000} trailSampler={trailSampler} />}
        {terrainSampler && <Trees terrainSampler={terrainSampler} count={300} />}
        {terrainSampler && (
          <Pin
            x={mapPosition.x}
            y={mapPosition.y}
            terrainSampler={terrainSampler}
            color="#ff4444"
            radius={0.15}
          />
        )}
        <OrbitControls
          target={orbitTarget}
          enablePan={false}
          maxPolarAngle={Math.PI / 2 - (Math.PI / 180) * 20}
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
          onStart={handleInteractionStart}
          onEnd={handleInteractionEnd}
        />
      </Canvas>
    </>
  );
}
