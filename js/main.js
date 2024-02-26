// Get the canvas and set its initial size
const canvas = document.querySelector("canvas.webgl");
const size = {};
size.width = window.innerWidth;
size.height = window.innerHeight;

// Create a renderer for WebGL
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true, // Enable smooth edges
  alpha: true, // Enable transparency
  performance: "high-performance", // Optimize for performance
  logarithmicDepthBuffer: true, // Enable logarithmic depth buffer for better precision
});

// Set initial renderer size and background color
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000); // Black background

// Create a scene
const scene = new THREE.Scene();

// Load a high dynamic range image for environment lighting
loadHDRI("assets/environments/gym_entrance[blue]_1k.hdr", renderer).then(
  (env) => {
    scene.environment = env;
  }
);

// Create an orthographic camera
const camera = new THREE.OrthographicCamera(
  size.width / -2,
  size.width / 2,
  size.height / 2,
  size.height / -2,
  0.1,
  1000
);
camera.zoom = 500; // Adjust zoom level
camera.position.set(0, 0, 2);
camera.updateProjectionMatrix();

// Create orbit controls for camera movement
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enablePan = false; // Disable panning
controls.enabled = true; // Enable controls
controls.mouseButtons = {
  LEFT: null,
  MIDDLE: null,
  RIGHT: THREE.MOUSE.ROTATE,
};

// Create a brush manager for interaction
let brush = new BrushManager(scene, camera);

// Define global uniforms for shaders
// Define global uniforms for shaders
const globalUniforms = {
  // Progress vector for animation
  uProgress: { value: new THREE.Vector4() },
  // Flag to enable or disable simulation
  enableSimulation: { value: false },
  // Resolution vector for screen size
  uResolution: {
    value: new THREE.Vector2(window.innerWidth, window.innerHeight),
  },
  // Time uniform
  uTime: { value: 0 },
  // Additional scale for particle in GPU
  forceScale: { type: "f", value: 1 },
  // Camera matrix uniform
  cameraMatrix: { value: null },
  // Other uniforms from brush
  ...brush.uniforms,
};

// Define options for cloud rendering
const cloudOptions = {
  // Size of the frame buffer object
  fboSize: 224,
  // Number of sides for particles (3 for triangle)
  sides: 4,
  // Stage parameter in the range [0, 1]
  stage: 0.25,
  // Seed value for particle scale
  scaleSeed: 0.00356,
  // Flag to make particles denser (color may be affected)
  dense: false,
  // Function to calculate particle scale based on stage
  get particleScale() {
    return this.scaleSeed * lerp(1, 4, this.stage * this.stage);
  },
  // Target point count based on frame buffer size
  get targetPointCount() {
    return this.fboSize * this.fboSize; // 224 * 224 => 50000
  },
  // Parameters for particle spread
  get zSpread() {
    return lerp(12, 1, this.stage); // Z-axis spread based on stage
  },
  get radialSpread() {
    return lerp(6, 3, this.stage); // radial spread based on stage
  },
  get normalSpread() {
    return lerp(1, 0.2, this.stage); // normal spread based on stage
  },
};

// Define material options for shaders
let materialOptions = {
  defines: {
    USE_INSTANCING: "",
  },
  flatShading: true,
  color: "white",
  metalness: 0.766,
  roughness: 0.13,
  side: THREE.DoubleSide,
  iridescence: 0,
  iridescenceIOR: 1.3,
  emissive: "white",
  emissiveIntensity: 0,
  envMapIntensity: 1,
  depthWrite: false,
  depthTest: false,
  opacity: 1,
  transparent: true,
  uniforms: { rotationAnimation: { value: new THREE.Vector4(10, 0, 0, 0) } },
};


// Sample JSON file for loading 3D models
let sampleJSON = ["/assets/json/awi.json"];

// Create a timeline for animation control
const timeline = new TimeLine(globalUniforms);

// Load a JSON file with 3D models
const loadJson = async (url) => {
  try {
    let response = await fetch(url);
    let { models } = await response.json();
    cloud.loadCloudModels(models);
  } catch (error) {
    console.log(error);
  }
};

// Load the first JSON file
loadJson(sampleJSON[0]);



// Create light sources
const lights = new LightManager();
scene.add(lights.group);

// Create post-processing effects manager
const PP = new PostprocessManager(scene, camera, renderer);

// Create a cloud manager for particle rendering
const cloud = new CloudManager(
  renderer,
  (options = { cloudOptions, uniforms: globalUniforms, materialOptions })
);



 { 
   // create random point grometry to prevent 0 clash
   // Create arrays for points, normals, and colors

   let pts = [];
   let nrm = [];
   let color = [];
   let p = new THREE.BufferGeometry();

   // Generate random points, normals, and colors
   for (let i = 0; i < cloud.cloudMesh.count * 3; i += 3) {
     pts.push(random() - 0.5, random() - 0.5, random() + 100);
     color.push(random(), random(), random());
     nrm.push(random() - 0.5, random() - 0.5, random() - 0.5);
   }

   // Set attributes for position, color, and normal
   p.setAttribute(
     "position",
     new THREE.BufferAttribute(new Float32Array(pts), 3)
   );
   p.setAttribute(
     "color",
     new THREE.BufferAttribute(new Float32Array(color), 3)
   );
   p.setAttribute(
     "normal",
     new THREE.BufferAttribute(new Float32Array(nrm), 3)
   );

   cloud.updateInstance(p);
 }
// Add the cloud mesh to the scene
scene.add(cloud.cloudMesh);

// Render the scene with post-processing effects
PP.render();

// Hide the cloud initially
cloud.visible(false);

// Event listeners for timeline events
timeline.addEventListener('start', () => {
  console.log('Timeline start');
});

timeline.addEventListener('end', () => {
  console.log('Timeline end');
});

timeline.addEventListener('reset', () => {
  console.log('Timeline reset');
});

// Event listener for cloud ready event
cloud.addEventListener("ready", (event) => {
  let { info } = event;
  let { metadata } = info.model;

  // Use as needed
  // cloud.swapById(metadata.id);
  timeline.update();
  cloud.swapByIndex(0);
  cloud.visible(true);
});

// Event listeners for cloud error, fall-in, and fall-out events
// cloud.addEventListener("error", (event) => {
//   let { error } = event;
//   console.log(error, "error");
// });

cloud.addEventListener('fallin',(event)=>{
  let {model} = event
  console.log(event,model,'fallin');
})

// cloud.addEventListener('fallout',(event)=>{
//   let {model} = event
//   console.log(event,'fallout');
// })

// Event listener for keyboard input to swap active samples
window.addEventListener("keydown", swapControl());

// Define direction for swapping
let _direction = {
  ArrowLeft: -1,
  ArrowRight: 1,
  Space: 1,
};


// Function to swap active samples based on keyboard input
function swapControl() {
  let moveDelta = 0;
  return ({ code }) => {
    if (!_direction[code]) return;
    let index = cloud.activeSample;
    moveDelta += 1 * _direction[code];
    cloud.activeSample = abs(moveDelta % cloud.cloudGroup.length);
    cloud.swapByIndex(cloud.activeSample);

    // Uncomment to restart the timeline
    // timeline.update();
  };
}

// Animation loop
const animate = () => {
  globalUniforms.uTime.value += 0.1;
  PP.render();
  cloud.update();
  TWEEN.update()
  window.requestAnimationFrame(animate);
};

// Start the animation loop
animate();




// use timeline event 'end' to trigger any function
// like start swap when it's done,
// globalUniform -> startSimulation will be false during the transition

// Define constants for timeline and effects
// const TIMELINE1 = 0.0;
// const TIMELINE2 = 10.0;
// const NO_EFFECT = 0.; // simulation 0 to target
// const FADE = 1.;
// const EXPLODE = 2.;
// const AXIS_EXPLODE = 3.;

// Note: These constants are likely placeholders for specific timings and effects.

// To avoid issues with larger particle size (>=1),
// make sure to set cloud visibility to false before it's ready

// Example:
// cloud.visible(false);
// ... (other code)
// cloud.addEventListener("ready", (event) => {
//    cloud.visible(true); // Show the cloud after it's ready
//    ...
// });

