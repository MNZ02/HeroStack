import * as THREE from 'three'

export class Studio {
  constructor(scene) {
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b2a0, 1.05))

    const key = new THREE.DirectionalLight(0xfff8ec, 1.7)
    key.position.set(4, 7, 4)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left = -7
    key.shadow.camera.right = 7
    key.shadow.camera.top = 9
    key.shadow.camera.bottom = -7
    key.shadow.camera.near = 1
    key.shadow.camera.far = 25
    key.shadow.bias = -0.0004
    scene.add(key)

    const fill = new THREE.DirectionalLight(0xe8eef4, 0.5)
    fill.position.set(-5, 2, -4)
    scene.add(fill)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.ShadowMaterial({ opacity: 0.1 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -5.4
    ground.receiveShadow = true
    scene.add(ground)
  }
}
