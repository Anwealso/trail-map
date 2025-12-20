import 'react-native/Libraries/Core/InitializeCore'

// Hermes-compatible patch for WebGL getProgramInfoLog
if (
  global.WebGLRenderingContext &&
  typeof global.WebGLRenderingContext.prototype.getProgramInfoLog === 'function'
) {
  const original = global.WebGLRenderingContext.prototype.getProgramInfoLog
  global.WebGLRenderingContext.prototype.getProgramInfoLog = function (...args) {
    const result = original.apply(this, args)
    return typeof result === 'string' ? result : ''
  }
}

import React, { useRef, Suspense } from 'react'
import { View } from 'react-native'
import { Canvas, useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import { StatusBar } from 'expo-status-bar'

function RotatingBox() {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01
      meshRef.current.rotation.y += 0.01
    }
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  )
}

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <Suspense fallback={null}>
        <Canvas
          onCreated={({ gl }) => {
            ;(gl as any).debug = { checkShaderErrors: false }
          }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} />
          <RotatingBox />
        </Canvas>
      </Suspense>
      <StatusBar hidden />
    </View>
  )
}
