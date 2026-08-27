import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

/**
 * Product-shot lighting: one hard key that casts the contact shadow, a cool
 * fill from the opposite side, a warm rim to pick out the top edge, and
 * RoomEnvironment as the only "asset" — a procedural room, prefiltered into an
 * env map, which is what gives the plastic its soft reflected sheen.
 */
export class Studio {
  constructor(scene, renderer) {
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.55
    pmrem.dispose()

    const key = new THREE.DirectionalLight(0xffffff, 2.6)
    key.position.set(5.5, 8.5, 6.5)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.radius = 3
    key.shadow.bias = -0.0012
    const c = key.shadow.camera
    c.near = 1; c.far = 30
    c.left = -6; c.right = 6; c.top = 6; c.bottom = -6
    c.updateProjectionMatrix()
    scene.add(key)

    const fill = new THREE.DirectionalLight(0x8fb6ff, 0.7)
    fill.position.set(-7, 2.5, 4)
    scene.add(fill)

    const rim = new THREE.DirectionalLight(0xffc98a, 1.1)
    rim.position.set(-3, 5, -8)
    scene.add(rim)

    scene.add(new THREE.HemisphereLight(0x9fb3c8, 0x0a0c0f, 0.35))

    // Shadow catcher only — the page background shows through everywhere else.
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(11, 64),
      new THREE.ShadowMaterial({ opacity: 0.42 })
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -2.62
    floor.receiveShadow = true
    scene.add(floor)

    this.key = key
  }
}
