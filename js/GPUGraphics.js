// This class represents a GPU-based graphics system used for simulations.
// The GPU graphics system is initialized with a specified texture size, renderer, and uniforms.

class GPUGraphics {
    constructor(textureSize , renderer,uniforms){
      // Store input parameters
      this.textureSize = textureSize;
      this.renderer = renderer;
      this.uniforms = uniforms;

      // Create a GPU computation renderer for parallel calculations.
      let gpuCompute = new THREE.GPUComputationRenderer(textureSize,textureSize,renderer);
      if ( renderer.capabilities.isWebGL2 === false ) {
        gpuCompute.setDataType( THREE.HalfFloatType );
       }

      // Create textures for position, velocity, rest position, and rest ID.
       let  positionTexture = gpuCompute.createTexture();
       let velocityTexture = gpuCompute.createTexture(); 
       let restPositionTexture = gpuCompute.createTexture();    
       let restIdTexture = gpuCompute.createTexture();    
       
  

       
      // Define variables for position and velocity with custom vertex shaders.
       let positionVariable = gpuCompute.addVariable( 'positionTexture',this.positionShader, positionTexture );
       let velocityVariable = gpuCompute.addVariable( 'velocityTexture',this.velocityShader, velocityTexture );
       
      // Set common vertex shader code for both position and velocity.
       positionVariable.material.vertexShader =
       velocityVariable.material.vertexShader =`
        varying vec2 vUv;
        void main()	{
	        gl_Position = vec4( position, 1.0 );
            vUv = position.xy * 0.5 + 0.5;
        }`


       
       let fboUniforms = {
        rotation : {  value:new THREE.Vector3(1,0,0)},// x=> twist amount y=>twist radius
        forceState: { type: "i", value: 0 },
        brushForceScale : { value: 100},
        brushGravityScale : { value: 0.},
        brushRadius : { value: .50},
        gravityScale : {value : .25},
        dt :{value:0.1},
        maxAge : { value:5},
        noiseType :{ type:'i' ,value:1 },
        noiseFreq :{value : new THREE.Vector3(0.001,0.002,0.003)},
        noiseOffset :{value:new THREE.Vector3(0,0,0)},
        noiseScale :{value:1.},
        meshScale : {value:1.},
        lightPosition: { value: new THREE.Vector3() },
        mousePosition: { value: new THREE.Vector3() },
        mouseVelocity: { value: new THREE.Vector3() },
      }
    
      // fboUniforms.dt.value=0.1;

      let G1 = {
        restPositionTexture: {value : restPositionTexture},
        restIdTexture: {value : restIdTexture},
        positionRelativeTexture: {value : null},
        velocityTexture: {value : null},
        positionTexture: {value : null},        
    }


       positionVariable.material.uniforms = {
        // ...globalUniforms,
        ...fboUniforms,
        ...G1,
        ...this.uniforms,
        ...positionVariable.material.uniforms,
      };
      velocityVariable.material.uniforms = {
        // ...globalUniforms,
        ...fboUniforms,
        ...G1,
        ...this.uniforms,
        ...velocityVariable.material.uniforms,
      };

      // Set up variable dependencies and initialize GPU computation.
      gpuCompute.setVariableDependencies( positionVariable, [ positionVariable ,velocityVariable ] );
      gpuCompute.setVariableDependencies( velocityVariable, [ positionVariable , velocityVariable] );
      
      this.positionVariable  = positionVariable;
      this.velocityVariable = velocityVariable;
      this.restPositionTexture = restPositionTexture;
      this.restIdTexture = restIdTexture;
      this.velocityTexture = velocityTexture;
      this.positionTexture = positionTexture;
      this.G1 = G1;
      this.fboUniforms = fboUniforms;
      this.gpuCompute = gpuCompute;
      gpuCompute.init();

      // Update GPU textures to reflect changes.
      this.updateGPUTexture();

    }

    // Method to update GPU textures after computation.
    updateGPUTexture(){
        let _ = this;
        _.gpuCompute.compute();
        _.restPositionTexture.needsUpdate = true;
        _.restIdTexture.needsUpdate = true; 
        _.G1.positionTexture.value = _.G1.positionRelativeTexture.value = _.gpuCompute.getCurrentRenderTarget( _.positionVariable ).texture;
        _.G1.velocityTexture.value = _.gpuCompute.getCurrentRenderTarget( _.velocityVariable ).texture;
    }


  // Custom shader code for position calculations.

    get positionShader(){
        return `

        // Constants
        const float TIMELINE_OFFSET = 10.0;
        const float TIMELINE1 = 0.0;
        const float TIMELINE2 = TIMELINE_OFFSET + TIMELINE1;
        const float NOEFECT = 0.0;
        const float FADE = 1.0;
        const float EXPLODE = 2.0;
        const float AXISEXPLODE = 3.0;
        const vec3 EXPLODEANGLE = vec3(-0.1, 0.0, -0.1);
        const float pi = 3.1415926535897932384626433832795;
        
        // Precision
        precision highp float;
        
        // Random Function
        float rand(vec2 co) {
            return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }

        vec3 rotateAxisAngle(vec3 v, vec3 axis, float angle) {
            return (cos(angle) * v) + (sin(angle) * cross(axis, v)) + ((1.0 - cos(angle)) * dot(axis, v) * axis);
        }
    
        float hash13(vec3 p3)
        {
            p3 = fract(p3 * .1031);
            p3 += dot(p3, p3.zyx + 31.32);
            return fract((p3.x + p3.y) * p3.z);
        }
        
        // Uniforms
        uniform float uTime;
        uniform sampler2D restPositionTexture;
        uniform sampler2D restIdTexture;
        uniform sampler2D positionRelativeTexture;
        varying vec2 vUv;
        uniform float dt;
        uniform float time_s;
        uniform vec4 uProgress;
        uniform float particleAnimationDuration_s;
        uniform vec3 rotation;
        uniform bool enableSimulation;
        
        void main() {
            vec4 restPosition = texture2D(restPositionTexture, vUv);
            float ids = floor(restPosition.w);
            vec4 relativePosition = texture2D(positionRelativeTexture, vUv);
            vec4 velocity = texture2D(velocityTexture, vUv);
        
            vec3 originalPosition = restPosition.xyz;
            vec3 dirToOrigin = originalPosition - relativePosition.xyz;
            float distToOrigin = length(dirToOrigin);
        
            if (!enableSimulation) {
                // When simulation is disabled
                vec3 temp = restPosition.xyz;
                vec3 randPos = vec3((hash13(temp) - 0.5) * 10.0, (hash13(temp + 100.0) - 0.5) * 10.0, (hash13(temp - 10.0) - 0.5) * 10.0);
        
                float t = uProgress.x;
                float t2 = uProgress.y;
                vec4 finalPosition = vec4(restPosition.xyz, 0.0);
        
                vec2 uv = fract(vUv); 
                    uv-=0.5; // Keep UV in [-0.5, 0.5] range
                 
                // check ids from animationIds   
                if (ids != NOEFECT) {
                    // Handle effects
                    if (mod(ids, 10.0) == FADE) {
                        finalPosition.w = 1.0 - t;
                        if (ids == TIMELINE2 + FADE) finalPosition.w = 1.0 - t2;
                        gl_FragColor = vec4(finalPosition);
                        return;
                    }
        
                    if (mod(ids, TIMELINE2) == EXPLODE || mod(ids, 10.0) == AXISEXPLODE) {
                        float steps = (ids == TIMELINE2 + EXPLODE || ids == TIMELINE2 + AXISEXPLODE) ? t2 : t;
                        temp.xyz = mix(temp.xyz - vec3(0.0, 0.0, 0.0), temp.xyz, steps);
        
                        if (mod(ids, TIMELINE2) == AXISEXPLODE) randPos = -vec3(0.0, 0.0, 100.0);
        
                        finalPosition.xyz = mix(temp, randPos, clamp((1.0 - uv.x * 1.0 - steps), 0.0, 1.0));
        
                        if (mod(ids, TIMELINE2) == AXISEXPLODE) {
                            finalPosition.xyz = rotateAxisAngle(finalPosition.xyz, EXPLODEANGLE, mix(0.0, (pi * 2.0) / 4.0, 1.0 - steps));
                        }
        
                        dirToOrigin = restPosition.xyz - finalPosition.xyz;
                        distToOrigin = length(dirToOrigin);
                        finalPosition.xyz = mix(finalPosition.xyz, temp, clamp(steps, 0.0, 1.0));
                        finalPosition.w = 1.0 - steps;
                    }
                }
        
                gl_FragColor = vec4(finalPosition);
                return;
            }
        
    
            // When simulation is enabled
            vec3 newPosition = relativePosition.xyz + velocity.xyz * dt;
        
            // Twisting effect based on distance and fixed radius
            float twistAmount = rotation.x * 0.01;
            float radius = rotation.y * 1.0;
        
            // Apply twisting effect
            if (rotation.x > 0.0) {
                float twistFactorX = twistAmount * distToOrigin * radius;
                float twistFactorY = twistAmount * distToOrigin * radius;
                float twistFactorZ = twistAmount * distToOrigin * radius;
        
                float cosX = cos(twistFactorX);
                float sinX = sin(twistFactorX);
                float cosY = cos(twistFactorY);
                float sinY = sin(twistFactorY);
                float cosZ = cos(twistFactorZ);
                float sinZ = sin(twistFactorZ);
        
                mat3 twistingMatrix = mat3(
                    vec3(cosY * cosZ, -cosX * sinZ + sinX * sinY * cosZ, sinX * sinZ + cosX * sinY * cosZ),
                    vec3(cosY * sinZ, cosX * cosZ + sinX * sinY * sinZ, -sinX * cosZ + cosX * sinY * sinZ),
                    vec3(-sinY, sinX * cosY, cosX * cosY)
                );
        
                newPosition = originalPosition + twistingMatrix * (newPosition - originalPosition);
            }
        
            gl_FragColor = vec4(newPosition, 1.0 - velocity.w);
        }
        
        `


    }

  // Custom shader code for velocity calculations.
    get velocityShader(){
        return `
        precision highp float; // Adjust precision as needed

        precision highp float;
        
        uniform sampler2D restPositionTexture;
        uniform sampler2D positionRelativeTexture;
        uniform float dt;
        uniform float uTime;
        varying vec2 vUv;
        
        uniform float time_s;
        uniform float particleAnimationDuration_s;
        uniform float uFormationGlobal;
        
        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;
        uniform float meshScale;
        uniform vec3 mousePosition;
        uniform vec3 mouseVelocity;
        uniform int noiseType;
        uniform vec3 noiseFreq;
        uniform vec3 noiseOffset;
        uniform float noiseScale;
        uniform int forceState;
        uniform float brushRadius;
        uniform float brushGravityScale;
        uniform float brushForceScale;
        uniform float gravityScale;
        uniform float maxAge;
        
        const float pi = 3.1415926535897932384626433832795;
        
        void main() {
          vec4 o = vec4(0.0, 0.0, 0.0, 1.0);
          vec4 pos = vec4(0.0, 0.0, 0.0, 1.0);
          vec4 vel = vec4(0.0, 0.0, 0.0, 1.0);
          vec4 nrm = vec4(0.0, 0.0, 0.0, 1.0);
          vec4 prop = vec4(0., 0., 0., 1.); //texture2D( propertyTexture, vuv );
          float ids = texture2D(restPositionTexture, vUv).w;
        
          ids = floor(ids);
          float progress = clamp(uTime * 0.1, 0., 1.);
        
          o = texture2D(restPositionTexture, vUv);
          pos = texture2D(positionRelativeTexture, vUv);
          vel = texture2D(velocityTexture, vUv);
        
          vec3 originPos = o.xyz * 1.;
          vec3 dirToOrigin = originPos - pos.xyz;
          float distToOrigin = length(originPos - pos.xyz);
          vec3 dirToMouse = pos.xyz - mousePosition;
          float distToMouse = length(dirToMouse);
          float diffm = max(distToMouse / (brushRadius * 0.1), 5.0);
          vec3 brushMoveForce = (mouseVelocity * brushForceScale) / (diffm * diffm);
          vec3 brushGravity = (dirToMouse / (diffm * diffm)) * brushGravityScale;
          if (forceState > 0) {
            vel.xyz += brushMoveForce - brushGravity;
          }
          vel.xyz = mix(vel.xyz, dirToOrigin * gravityScale, dt * 0.5);
          vel.w = 1. - distToOrigin;
        
          gl_FragColor = vec4(vel);
        }
        
       `;
        
    }
}