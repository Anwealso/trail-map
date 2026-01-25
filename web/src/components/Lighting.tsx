import * as THREE from "three";

export function Lighting() {
  return (
    <>
      {/* Soft overall ambient fill */}
      <ambientLight intensity={0.6} />

      {/* Warm Key Light (Sun) - casts the main shadows */}
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.5}
        color="#fff4e0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />

      {/* Cool Fill Light - softens the shadows from the side */}
      <pointLight position={[-10, 5, 5]} intensity={0.8} color="#dbeafe" />

      {/* Rim Light - highlights the clay edges from behind */}
      <spotLight
        position={[5, 10, -10]}
        intensity={2.0}
        angle={0.5}
        penumbra={1}
        color="#ffffff"
      />

      {/* Subtle Bounce Light */}
      <pointLight position={[0, -5, 0]} intensity={0.3} color="#fff" />
    </>
  );
}
