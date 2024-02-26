
// Class for managing brushes
class BrushManager {
  constructor(scene, camera) {
    // Define uniforms for brushes
    let uniforms = {
      //  twist for brushes x:strength y:radius
      rotation: { value: new THREE.Vector3(1, 1.2, 0) },
      // State flag for brush force
      forceState: { type: "i", value: 0 },
      // Brush force scale
      brushForceScale: { value: 100 },
      // Brush gravity scale
      brushGravityScale: { value: 0. },
      // Brush radius
      brushRadius: { value: .1 },
      // Gravity scale
      gravityScale: { value: .25 },
      // Delta time for reaching the original position
      dt: { value: .1 },
      // Maximum age for brushes
      maxAge: { value: 5 },
      // Noise type for future use
      noiseType: { type: 'i', value: 1 },
      // Noise frequency vector
      noiseFreq: { value: new THREE.Vector3(0.001, 0.002, 0.003) },
      // Noise offset vector
      noiseOffset: { value: new THREE.Vector3(0, 0, 0) },
      // Noise scale
      noiseScale: { value: 1. },
      // Mesh scale
      meshScale: { value: 1. },
      // Light position vector
      lightPosition: { value: new THREE.Vector3() },
      // Mouse position vector
      mousePosition: { value: new THREE.Vector3() },
      // Mouse velocity vector
      mouseVelocity: { value: new THREE.Vector3() },
    };

    // Additional variables for mouse interaction
    let pointer = new THREE.Vector2();
    let tmpPosition = new THREE.Vector3();

    // Create a 3D plane for mouse interaction
    const plane3D = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial({ transparent: true, color: 'red', opacity: 0.0 }));
    scene.add(plane3D);

    // Create a helper sphere for visualizing mouse position
    let mouseHelper = new THREE.Mesh(new THREE.SphereGeometry(1, 32), new THREE.MeshBasicMaterial({ color: "blue", wireframe: true }));
    scene.add(mouseHelper);

    // Set visibility for debugging (switch to false in production)
    plane3D.visible = true;
    mouseHelper.visible = true;

    // Scale the helper sphere based on brush radius
    mouseHelper.scale.set(uniforms.brushRadius.value, uniforms.brushRadius.value, uniforms.brushRadius.value);

    // Event listeners for mouse interactions
    const raycaster = new THREE.Raycaster();
    window.addEventListener('pointermove', updateMousePosition);
    window.addEventListener('pointerdown', updateMouseDown);
    window.addEventListener('pointerup', updateMouseUp);

    // Set uniforms and functions for the class instance
    this.uniforms = uniforms;

    function updateMouseDown(event) {
      // Handle mouse down event (modify speed if required)
      if (event.button === 2) return; // Right mouse button, optional handling (camera control will use right click and pointer move for model rotate)
      uniforms.forceState.value = 1; // Activate physics
    }

    function updateMouseUp(event) {
      // Handle mouse up event
      uniforms.forceState.value = 0;//Deactivate physics simulation
      uniforms.dt.value = .1; // Reset delta time
    }

    function updateMousePosition(event) {
      // Update mouse position based on pointer and raycaster
      updatePointer(event);
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(plane3D, false);
      if (intersects.length) {
        let { point } = intersects[0];
        mouseHelper.position.copy(point);
        let velocity = new THREE.Vector3();
        velocity.copy(point);
        velocity.sub(tmpPosition);
        velocity.multiplyScalar(2.);
        uniforms.mousePosition.value.copy(point);
        uniforms.mouseVelocity.value.copy(velocity);
        tmpPosition.copy(point);
      }
    }

    function updatePointer(event) {
      // Update pointer position
      plane3D.lookAt(camera.position);
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
  }
}
