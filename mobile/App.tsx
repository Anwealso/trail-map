import { View, StyleSheet } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl'
import { Renderer } from 'expo-three'
import {
  Scene,
  PerspectiveCamera,
  BoxGeometry,
  MeshStandardMaterial,
  Mesh,
  AmbientLight,
  DirectionalLight,
} from 'three'

export default function App() {
  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const renderer = new Renderer({ gl })
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight)
    renderer.setClearColor(0x1a1a2e)

    const scene = new Scene()
    const camera = new PerspectiveCamera(
      50,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    )
    camera.position.set(5, 5, 5)
    camera.lookAt(0, 0, 0)

    const geometry = new BoxGeometry(2, 2, 2)
    const material = new MeshStandardMaterial({ color: 0xffa500 })
    const cube = new Mesh(geometry, material)
    scene.add(cube)

    const ambientLight = new AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const directionalLight = new DirectionalLight(0xffffff, 1)
    directionalLight.position.set(10, 10, 5)
    scene.add(directionalLight)

    const animate = () => {
      requestAnimationFrame(animate)
      cube.rotation.x += 0.01
      cube.rotation.y += 0.01
      renderer.render(scene, camera)
      gl.endFrameEXP()
    }
    animate()
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <GLView style={styles.glView} onContextCreate={onContextCreate} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  glView: {
    flex: 1,
  },
})
