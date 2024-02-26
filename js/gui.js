let gui = new dat.GUI();

{
    let _ = brush
    let s = gui.addFolder('simulation');
    let r = s.addFolder('twist');
    r.add(brush.uniforms.rotation.value,'x',0,10,0.5).name('strength')
    r.add(brush.uniforms.rotation.value,'y',0,2,0.1).name('radius')
    r = s.addFolder('brush');
    r.add(brush.uniforms.brushForceScale,'value',0,200,1).name('Brush Force')
    r.add(brush.uniforms.brushGravityScale,'value',0,100,1).name('Brush Gravity')
    r.add(brush.uniforms.gravityScale,'value',.1,10,0.1).name('Cloud Gravity')

    _=cloud.cloudMaterial;
    s = gui.addFolder('cloud');
     r =s.addFolder('material');
    r.add(_,'metalness',0,1,0.01).name('metalness');
    r.add(_,'roughness',0,1,0.01).name('roughness');
    r.add(_,'iridescence',0,1,0.01).name('iridescence');
    r.add(_,'envMapIntensity',0,2,0.01).name('envMapIntensity');
   
    r =s.addFolder('geometry');
    r.add(_.uniforms.rotationAnimation.value,'x',0,100,0.01).name('rotationFilter')
    r.add(globalUniforms.forceScale,'value',0,20,0.01).name('particle Scale')
    r.add(cloudOptions,'sides',3,10,1).name('side').onChange((v)=>{
        cloud.cloudMesh.geometry = new THREE.CircleGeometry(1,v);
        cloud.cloudMesh.needsUpdate = true;
    })

    r =gui.addFolder('controls');
    r.add(controls,'minDistance',0,100).name('minDistance').onChange(()=>{controls.update()})
    r.add(controls,'maxDistance',0,100).name('maxDistance').onChange(()=>{controls.update()})

    r =gui.addFolder('bloom');
    r.add(PP.bloomPass,'threshold',0,1,0.1).name('threshold')
    r.add(PP.bloomPass,'strength',0,1,0.1).name('strength')
    r.add(PP.bloomPass,'radius',0,1,0.1).name('radius')

}