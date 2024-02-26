class CloudManager extends THREE.EventDispatcher {
  constructor(renderer, parameters) {
    super();

    // Extract parameters from the provided object
    let { cloudOptions, materialOptions, uniforms } = parameters;

    // Initialize properties and create a web worker
    this.cloudOptions = cloudOptions;
    this.cloudGroup = [];
    this.activeSample = 0;
    this.worker = new Worker("js/worker.js");

    // example animation timelines in json 

    // const TIMELINE1 = 0.0;
    // const TIMELINE2 = 10.0;
    // const NO_EFFECT = 0.;
    // const FADE = 1.;
    // const EXPLODE = 2.;
    // const AXIS_EXPLODE = 3.;

    // Create GPU graphics for handling textures
    let gpuGraphics = new GPUGraphics(cloudOptions.fboSize, renderer, uniforms);
    this.restPositionTexture = gpuGraphics.restPositionTexture;
    this.gpuGraphics = gpuGraphics;

    // Create a reference geometry (circle) and cloud material
    const referenceGeometry = new THREE.CircleGeometry(1, cloudOptions.sides);
    let cloudMaterial = new CloudMaterial({
      ...materialOptions,
      uniforms: Object.assign(uniforms, gpuGraphics.G1, materialOptions.uniforms),
    });

    // Create an instanced mesh for the cloud
    const instanceMesh = new THREE.InstancedMesh(referenceGeometry, cloudMaterial, cloudOptions.targetPointCount);
    instanceMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instanceMesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0);
    instanceMesh.geometry.boundingBox = new THREE.Box3(new THREE.Vector3(-1 / 0, -1 / 0, -1 / 0), new THREE.Vector3(1 / 0, 1 / 0, 1 / 0));
    instanceMesh.frustumCulled = false; // Set to false for optimization

    // Set properties for the CloudManager instance
    this.cloudMesh = instanceMesh;
    this.cloudMaterial = cloudMaterial;
    this.worker.addEventListener("message", this.handleWorkerMessage.bind(this));

    // Listen for worker messages to handle processed geometry or errors
    // this.worker.addEventListener("message", this.handleWorkerMessage.bind(this));
  }

  // Method to handle messages from the worker
  handleWorkerMessage(event) {
    // Extract message data
    const { type, error } = event.data;

    // Handle processed geometry
    if (type === "processed") {
      const { geometry } = event.data;
      this.cloudGroup.push(geometry);

      // Dispatch events when the first model is ready or a new model is added
      if (this.cloudGroup.length === 1) {
        this.dispatchEvent({
          type: "ready",
          info: { cloudGroup: this.cloudGroup, model: geometry },
        });
      }

      this.dispatchEvent({
        type: "added",
        info: { cloudGroup: this.cloudGroup, model: geometry },
      });
    }

    // Handle errors
    if (type === "error") {
      this.dispatchEvent({ type: "error", error: error });
    }
  }

  // Method to load cloud models asynchronously
  async loadCloudModels(modelDatas = []) {
    this.worker.postMessage({
      type: "process",
      options: this.cloudOptions,
      modelDatas: modelDatas,
    });
  }

  // Method to update the instance mesh with new geometry
  updateInstance(geometry) {
    // Extract relevant options
    let { particleScale, zSpread, radialSpread, normalSpread, targetPointCount, fboSize } = this.cloudOptions;
    let { restPositionTexture, cloudMesh: mesh } = this;

    // Extract attributes from the geometry
    let { position, normal, color, ids } = geometry.attributes;
    let positionData = position.array;
    let normalData = normal.array;
    let colorData = color.array;
    let availPointCount = position.count;

    // Initialize variables and vectors for transformations
    let k = fboSize;
    let _v1 = new THREE.Vector3();
    let _v2 = new THREE.Vector3();
    let _v3 = new THREE.Vector3();
    let _s = new THREE.Vector3();

    //to make basis matrix
    let _x = new THREE.Vector3(1, 0, 0);
    let _y = new THREE.Vector3(0, 1, 0);
    let _z = new THREE.Vector3(0, 0, 1);
    
    let _q = new THREE.Quaternion();
    let _m = new THREE.Matrix4();
    let _c = new THREE.Color();

    // Access texture data for manipulation
    let tmp = restPositionTexture.image.data;

 
    // Limit the number of points in the mesh to the minimum of available points
    // and the target point count to ensure proper sizing.
    mesh.count = Math.min(availPointCount, targetPointCount);

    // Define helper functions for attribute extraction
    const getPositionVector = (i) => {
      const x = positionData[3 * i + 0];
      const y = positionData[3 * i + 1];
      const z = positionData[3 * i + 2];
      return { x, y, z };
    };

    const getNormalVector = (i, _v1) => {
      _v1.set(normalData[3 * i + 0], normalData[3 * i + 1], normalData[3 * i + 2]);
      _v1.normalize();
      return _v1;
    };

    const getID = (i) => {
      return ids ? ids.array[i] : 0;
    };

    const getColorVector = (i) => {
      let r = colorData[3 * i + 0];
      let g = colorData[3 * i + 1];
      let b = colorData[3 * i + 2];
      return { r, g, b };
    };

    const getBySerial = (i) => {
      return i;
    };

    const getByRandom = (i) => {
      return Math.floor(Math.random() * availPointCount);
    };


    // Determine the mode of point selection based on the ratio of available points
    // to the target point count. If the ratio is greater than 0, use random selection,
    // otherwise, use serial (sequential) selection.
    let mode = (availPointCount / targetPointCount) > 0 ? getByRandom : getBySerial;

    for (let i = 0; i < targetPointCount; i++) {
      let id = mode(i);
      let { x, y, z } = getPositionVector(id);
      if (x !== undefined) {
        tmp[4 * i + 0] = x;
        tmp[4 * i + 1] = y;
        tmp[4 * i + 2] = z;
        tmp[4 * i + 3] = (getID(id)) || 0;
        getNormalVector(id, _v1);
        let { r, g, b } = getColorVector(id);

        let tpi = Math.random() * Math.PI * 0;
        let u = Math.cos(tpi);
        let h = Math.sin(tpi);

        _q.setFromUnitVectors(_z, _v1);
        let L1 = _v2.set(u, h, 0).applyQuaternion(_q);
        let L2 = _v3.set(-h, u, 0).applyQuaternion(_q);

        _m.makeBasis(L1, L2, _v1);
        _s.set(particleScale, particleScale, particleScale);
        _m.scale(_s);
        _c.setRGB(r, g, b);
        mesh.setColorAt(i, _c);
      } else {
        let id = getByRandom(i);
        let { x, y, z } = getPositionVector(id);
        let { r, g, b } = getColorVector(id);
        tmp[4 * i + 0] = x;
        tmp[4 * i + 1] = y;
        tmp[4 * i + 2] = z;
        tmp[4 * i + 3] = (getID(id)) || 0;
        _c.setRGB(r, g, b);
        mesh.setColorAt(i, _c);
      }

      let w = i % k,
        f = Math.floor(i / k),
        nx = (w + 0.5) / k,
        ny = (f + 0.5) / k;

      (_m.elements[3] = nx),
      (_m.elements[7] = ny),
      (_m.elements[11] = 0),
      mesh.setMatrixAt(i, _m);
    }

    restPositionTexture.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    return mesh;
  }

  // Method to swap models by index
  swapByIndex(index) {
    this.swap(this.cloudGroup[index % this.cloudGroup.length]);
  }

  // Method to swap models by ID
  swapById(id) {
    let geometry = this.cloudGroup.find(
      (geometry) => geometry.metadata.id == id
    );

    if (!geometry) {
      this.dispatchEvent({
        type: "error",
        error: `no id : ${id} found in models were loaded `,
      });
      return;
    }
    this.swap(geometry);
  }

  // Method to swap models
  swap(geometry) {
    console.log('swap')
    this.visible(true);
    if (this.active) {
      this.dispatchEvent({
        type: "fallout",
        info: { cloudGroup: this.cloudGroup, model: this.active },
      });
    }
    this.active = geometry;
    this.activeSample = this.cloudGroup.findIndex(
      (g) => g.metadata.id === geometry.metadata.id
    );
    try {
      this.updateInstance(geometry);
    } catch (error) {
      this.visible(false);
    }

    this.dispatchEvent({
      type: "fallin",
      info: { cloudGroup: this.cloudGroup, model: this.active },
    });
  }

  // Method to set visibility of the cloud mesh
  visible(show = true) {
    this.cloudMesh.visible = show;
  }

  // Method to update the GPU graphics
  update() {
    this.gpuGraphics.updateGPUTexture();
  }
}
