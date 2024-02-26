class PostprocessManager {
    constructor(scene, camera, renderer ) {
        const params = {
            threshold: 0.0,
            strength: 0.25,
            radius: .1,
            exposure: 1,
            toneIntensity: 1.9,
            showBackground: false,
            exposure: 1.0,
            toneMapping: 'AgX',
        };

       

        const pixelRatio = renderer.getPixelRatio();

        const renderScene = new THREE.RenderPass(scene, camera);

        const fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
        fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio);
        fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio);

        const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), .25, 0.1, 0.85);
        bloomPass.threshold = params.threshold;
        bloomPass.strength = params.strength;
        bloomPass.radius = params.radius;

        this.bloomPass = bloomPass;
        
        const composer = new THREE.EffectComposer(renderer);
        composer.setSize(window.innerWidth, window.innerHeight);
        composer.addPass(renderScene);
        composer.addPass(bloomPass);

        this.render = (delta)=>{
            composer.render(delta);
        }

        function onWindowResize() {
            let { innerWidth: width, innerHeight: height } = window;
            renderer.setSize(width, height);
            const newPixelRatio = Math.max(window.devicePixelRatio, 1.2);
            renderer.setPixelRatio(newPixelRatio);
            // globalUniform.uResolution.value.x = width;
            // globalUniform.uResolution.value.y = height;
            fxaaPass.material.uniforms['resolution'].value.x = 1 / (width * newPixelRatio);
            fxaaPass.material.uniforms['resolution'].value.y = 1 / (height * newPixelRatio);
            fxaaPass.setSize(width * newPixelRatio, height * newPixelRatio);
            bloomPass.setSize(width, height);
            // finalPass.setSize(width,height);
            composer.setSize(width,height)
            // bloomComposer.setSize(width,height)
            camera.aspect = width / height;
            camera.updateProjectionMatrix();

            camera.left = -width / 2;
            camera.right = width / 2;
            camera.top = height / 2;
            camera.bottom = -height / 2;
            camera.near = -1000;
            camera.far = 1000;
            camera.updateProjectionMatrix();
        }
        
        window.addEventListener('resize', onWindowResize);
    }


}
