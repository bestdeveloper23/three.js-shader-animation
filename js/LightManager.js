class LightManager{

    constructor(){
        this.group = new THREE.Object3D();
        let directionalLight = new THREE.DirectionalLight('white',100)
        directionalLight.position.set(0, 1, 1  );
        directionalLight.intensity = 2,
        directionalLight.color.setHex(8052479);
        this.group.add(directionalLight);
    }


}