var {sin, cos, random , round , floor ,abs, PI} = Math


function lerp  (a, b, t) {
  t = Math.max(0, Math.min(1, t));
  return a + t * (b - a);
}


function loadHDRI(url, renderer) {
    return new Promise(resolve => {
      const loader = new THREE.RGBELoader()
      const pmremGenerator = new THREE.PMREMGenerator(renderer)
      loader.load(url, (texture) => {
        const envMap = pmremGenerator.fromEquirectangular(texture).texture
        texture.dispose()
        pmremGenerator.dispose()
        resolve(envMap)
      })
    })
  }

  function genBox(texture,size){

    let len = texture.image.data.length;
    let data =texture.image.data;
    // let p = new Vector3();
    while( len-- ) len%4==3 ? data[len]  = 1 : data[len] = ( Math.random() -.5 ) ;
    return texture;
  }
  
  
  function getPoint(v,size){
    v.x =Math.random() * 2 - 1 ;
    v.y =Math.random() * 2 - 1 ;
    v.z =Math.random() * 2 - 1 ;
    // if(v.length() > 1) return getPoint(v,size);
    return v.normalize();
  }
  
  function genSphere(texture,size){

    let l = texture.image.data.length;
    let data =texture.image.data;
    let p = new THREE.Vector3();
    for(let i = 0 ; i <  l ; i+=4){
      getPoint(p,size);
      data[i] = p.x;
      data[i+1] = p.y;
      data[i+2] = p.z;
      data[i+3] = 1.;
    }
  
    return texture;
  
  }



  function normalizeGeometryVertices(geometry,translate = true , scale = true) {
    geometry.computeVertexNormals();
    //  geometry.computeTangents();
  
    const { attributes } = geometry;
  
    // Find the bounding box of the geometry
    const boundingBox = new THREE.Box3().setFromBufferAttribute(
      attributes.position
    );
  
    // Calculate the center of the bounding box
    const center = boundingBox.getCenter(new THREE.Vector3());
  
    // Calculate the size of the bounding box
    const size = boundingBox.getSize(new THREE.Vector3());
  
    // Calculate the maximum dimension to ensure uniform scaling
    const maxDimension = Math.max(size.x, size.y, size.z);
  
    // Scale the geometry to fit within a normalized range
    const scaleFactor = 1 / maxDimension;
    (translate)&&(geometry.translate(-center.x, -center.y, -center.z));
    scale&&(geometry.scale(scaleFactor, scaleFactor, scaleFactor));
  
    // Center the geometry around the origin
    // Update the geometry's bounding box
    geometry.computeBoundingBox();
    return geometry
  }