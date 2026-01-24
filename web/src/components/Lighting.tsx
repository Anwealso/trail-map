import * as THREE from "three";

export function Lighting() {
  return (
    <>
      {/* Soft overall ambient fill */}
      <ambientLight intensity={0.4} />

      {/* Warm Key Light (Sun) - casts the main shadows */}
      <directionalLight
        position={[10, 15, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Cool Fill Light - softens the shadows from the side */}
      <pointLight position={[-10, 5, -5]} intensity={0.5} color="#cbd5e1" />

      {/* Rim Light - highlights the clay edges from behind */}
      <spotLight
        position={[0, 10, -10]}
        intensity={0.8}
        angle={0.3}
        penumbra={1}
      />
    </>
  );
}
