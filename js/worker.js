// Import necessary libraries
importScripts("../libs/three.min.js");
importScripts("./utlis.js");

// Log a message indicating the worker is active
console.log('worker')

// Get the base URL of the worker's location
const baseURL = self.location.origin;

// Declare variables for cloud options, sampler, and models
let cloudOptions;
let sampler = [];
let models = [];

// replace ply loader if required
// const loader = new THREE.PLYLoader()

// Create a DRACOLoader for loading Draco compressed models
const loader = new THREE.DRACOLoader()
loader.setDecoderPath(baseURL +"/libs/draco/");

// Function to merge multiple geometries into a single buffer geometry
const mergeGeometries =(geometries)=>{
  // Arrays to store merged geometry data
  let posArr = [];
  let noArr =[];
  let colArr =[];
  let idArr =[];
  let mergedGeo = new THREE.BufferGeometry();
  
  // Iterate through each geometry
  geometries.forEach((geometry,index)=>{
    // Extract metadata and color information
    let {metadata} = geometry;
    let {color:mColor, animationId,name,id} = metadata;        
    console.log(`Processing geometry with animationId/name: ${animationId||0}/${name}`);
    
    // Ensure geometry has vertex normals
    geometry.computeVertexNormals();
    
    // Extract position, normal, and color attributes from the geometry
    let {attributes:{position,normal,color}} = geometry

    // Check if normal or color attributes are missing, use random values if so
    if(!normal || !color){
      console.log(`id : ${id} don't have normal or color, switching to random`);
    }

    // Iterate through each vertex of the geometry
    for(let i = 0; i < position.count; i++){
      let index =  i * 3 ;
      let [x,y,z] = [position.array[index + 0] , position.array[index + 1] ,position.array[index + 2]]            
      let [nx,ny,nz] = normal ?  [normal.array[index + 0] , normal.array[index + 1] ,normal.array[index + 2]] : [(Math.random()-0.5)*2.,(Math.random()-0.5)*2.,(Math.random()-0.5)*2. ];
      
      // Use random values if normal is missing
      if(!nx || !ny || !nz ) nx =(Math.random()-0.5)*2., ny = (Math.random()-0.5)*2., nz = (Math.random()-0.5)*2. ;
      
      // Use random color if metadata color is missing
      (!mColor && !color)&&(mColor = {r : 1 , g : 1 , b:1},console.log('no color and meta metacolor for ' + name));
      let [r,g,b] = ( !mColor ) ? [color.array[index + 0],color.array[index + 1],color.array[index + 2]] : [mColor.r,mColor.g,mColor.b]
      // Push vertex attributes to respective arrays
      posArr.push(x,y,z);
      noArr.push(nx,ny,nz);
      colArr.push(r,g,b);
      idArr.push(animationId || 0);
    }
  })

  // Set attributes of the merged geometry
  mergedGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(posArr),3));
  mergedGeo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(colArr),3));
  mergedGeo.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(noArr),3));
  mergedGeo.setAttribute('ids',new THREE.BufferAttribute(new Float32Array(idArr),1));
  
  // Set metadata for the merged geometry
  // metadata will based on first child with nerged name ie ARIVS
  mergedGeo.metadata = Object.assign({},geometries[0].metadata,{
    name : geometries.reduce((prev,current)=>{
      return prev+current.metadata.name
    },'')
  })

  // Return the merged geometry
  return mergedGeo;
}

// Function to initialize the processing of models
const initProcess = (options, modelDatas) => {
  // Set cloud options
  cloudOptions = options;  
  // Map through each model data
  modelDatas.map(modelData=>{
    // Create a model group by loading individual models asynchronously
    const modelGroup = modelData.map((data,i)=>{ 
      // Create an Object3D for each model
      let _o = new THREE.Object3D();
      // Extract data for model loading
      let { url, rotation, scale, position } = data;
      scale = scale || { x: 1, y: 1, z: 1 };
      rotation = rotation || { x: 0, y: 0, z: 0 };
      position = position || { x: 0, y: 0, z: 0 };
      return new Promise((res,rej)=>{
        // Load the model using DRACOLoader
        loader.load(
          `${baseURL}/${url}`,
          (geometry) => {  
            // Set transformation properties and apply to the model geometry
            _o.scale.set(scale.x, scale.y, scale.z);
            _o.rotation.set(rotation.x, rotation.y, rotation.z);
            _o.position.set(position.x, position.y, position.z);
            _o.updateMatrix();
            geometry.applyMatrix4(_o.matrix);
            geometry.computeVertexNormals();
            geometry.metadata = data;
            res(geometry)
          },
          ()=>{},
          (error)=>{
            console.log(error)
            // Post an error message if model loading fails
            self.postMessage({ type: "error", error: ` id : ${data.id} ${error} ` });
            rej(err);
          });
      })
    })

    // Wait for all models to be loaded, then merge the geometries
    Promise.all(modelGroup).then(mergeGeometries).then(model=>{
      let processedModel = model;
      // Densify the model if specified in options 
      if(options.dense) processedModel = densification(model,options);
      // uncomment if   normalize model [x,y,z] by  max [x,y,z] (fit in unit cube ) 
      // normalizeGeometryVertices(processedModel,false) 
      self.postMessage({ type: "processed", geometry: (processedModel) });
      
      console.log('-------------------------------------')
    })
    // .catch(error=>{
    //   // Post an error message if there's an issue with processing models
    //   self.postMessage({ type: "error", error: error.message });
    // })  
  })
};

// Function to densify a geometry by adding additional points
const densification = (geometry,options) => {
  // Extract options for densification
  let {
    particleScale: scale,
    zSpread,
    radialSpread,
    normalSpread,
    targetPointCount,
  } = options;

  // Extract position, normal, color, and ids attributes from the geometry
  const { name } = geometry.metadata;
  const { position, normal, color,ids } = geometry.attributes;

  // Create a new buffer geometry for densified points
  const dGeometry = new THREE.BufferGeometry();
  let positionData = position.array;
  let normalData = normal.array 
  let colorData =  color.array 
  let idsData =  ids.array 

  const count = position.count;

  // Calculate the number of additional points needed for densification
  const densificationFactor = Math.round((targetPointCount - count) / count);
  // Calculate the total count after densification
  const additionalPoints = count * densificationFactor;

  let n = additionalPoints > 0 ? densificationFactor : 0; // here 1 is optional   make 0 if require
  console.log(`Densification with additional point : ${additionalPoints} for  ${name} ` )
  if (!n) {
    return geometry;
  }
  
  // Calculate the total count after densification
  let wcount = count * (1 + n);
  let fPosition = new Float32Array(wcount * 3);
  let fNormal = new Float32Array(wcount * 3);
  let fColor = new Float32Array(wcount * 3);
  let fids = new Float32Array(wcount * 1);
  
  // Declare vectors and quaternions for calculations
  let _v1 = new THREE.Vector3();
  let _v2 = new THREE.Vector3();
  let _v3 = new THREE.Vector3();
  let _z = new THREE.Vector3(0, 0, 1);
  let _q = new THREE.Quaternion();
  let o = 0;
  
  // Iterate through each original vertex
  for (let i = 0; i < count; i++) {
    let x = positionData[i * 3 + 0],
      y = positionData[i * 3 + 1],
      z = positionData[i * 3 + 2];
    let r = colorData[i * 3 + 0],
      g = colorData[i * 3 + 1],
      b = colorData[i * 3 + 2];
      
    // Calculate normalized vector from original vertex normal
    _v1.set(
      normalData[i * 3 + 0],
      normalData[i * 3 + 1],
      normalData[i * 3 + 2]
    );
    _v1.normalize();
    _q.setFromUnitVectors(_z, _v1);

    let M = i * (1 + n);

    // Set original vertex position, normal, and color
    fPosition[M * 3 + 0] = x;
    fPosition[M * 3 + 1] = y;
    fPosition[M * 3 + 2] = z;

    fNormal[M * 3 + 0] = _v1.x;
    fNormal[M * 3 + 1] = _v1.y;
    fNormal[M * 3 + 2] = _v1.z;

    fColor[o++] = r;
    fColor[o++] = g;
    fColor[o++] = b;
    fids[M] = idsData[i];

    // Iterate through additional points for densification
    for (let j = 0; j < n; j++) {
      let N = M + j + 1;
      let r = lerp(scale, scale * radialSpread, random());
      let tpi = random() * PI * 2;
      let rx = cos(tpi) * r;
      let ry = sin(tpi) * r;

      let q1 = _v2.set(rx, ry, 0).applyQuaternion(_q);
      let q2 = _v3.set(-ry, rx, 0).applyQuaternion(_q);

      let rz = lerp(-zSpread * scale * 0.5, zSpread * scale * 0.5, random());

      let p1 = x + q1.x + q2.x + _v1.x * rz;
      let p2 = y + q1.y + q2.y + _v1.y * rz;
      let p3 = z + q1.z + q2.z + _v1.z * rz;

      let nx = _v1.x + (random() - 0.5) * normalSpread;
      let ny = _v1.y + (random() - 0.5) * normalSpread; 
      let nz = _v1.z + (random() - 0.5) * normalSpread;

      fPosition[N * 3 + 0] = p1;
      fPosition[N * 3 + 1] = p2;
      fPosition[N * 3 + 2] = p3;

      fNormal[N * 3 + 0] = nx;
      fNormal[N * 3 + 1] = ny;
      fNormal[N * 3 + 2] = nz;

      fColor[o++] = r;
      fColor[o++] = g;
      fColor[o++] = b;

      fids[N] = idsData[i];
    }
  }

  // Set attributes for the densified geometry
  dGeometry.setAttribute("position", new THREE.BufferAttribute(fPosition, 3));
  dGeometry.setAttribute("normal", new THREE.BufferAttribute(fNormal, 3));
  dGeometry.setAttribute("color", new THREE.BufferAttribute(fColor, 3));
  dGeometry.setAttribute("ids", new THREE.BufferAttribute(fids, 1));
  dGeometry.metadata = geometry.metadata;
  
  // Return the densified geometry
  console.log(dGeometry)
  return dGeometry;
};

// Event listener for messages from the main thread
self.addEventListener("message", (event) => {
  // Extract data from the event
  const { command, type, options, modelDatas } = event.data;

  console.log(command, type, options, modelDatas);

  // Check the type of the message
  if (type === "process") {
    // Initialize the model processing
    initProcess(options, modelDatas);
  } 
  if (type === "error") {
    // Handle errors from the worker
    console.error("Error in worker:", event.data.error);
  }
});
