class CloudMaterial extends THREE.MeshPhysicalMaterial {
  constructor(options) {
    super({
      flatShading: true,
      color: 16777215, // White color
      metalness: 0.06,
      roughness: 0.13,
      side: THREE.DoubleSide,
      iridescence: 0,
      iridescenceIOR: 1.3,
      emissive: 16777215, // White emissive color
      emissiveIntensity: 0,
      envMapIntensity: 1,
      opacity: 1,
      transparent: true,
     ...options,
    });

    // Define custom uniforms for the material, including time-based animations.
    this.uniforms = Object.assign({},{
        uTime: { value: 0 },
        // rotationAnimation.x value make higher filer particle to rotate [spark effect ]
        rotationAnimation: { value: new THREE.Vector4(.1, 0, 0, 0) },
    },options.uniforms),
    

    this.onBeforeCompile = (shader) => {
      shader.uniforms = {
        ...shader.uniforms,
        ...this.uniforms
      }
      shader.vertexShader = this.vertexShader;
      shader.fragmentShader = this.fragmentShader;
    };
  }

 get vertexShader (){
  return  ` 
  #define STANDARD
  varying vec3 vViewPosition;
  #ifdef USE_TRANSMISSION
  varying vec3 vWorldPosition;
  #endif
  #include <common>
  #include <uv_pars_vertex>
  #include <color_pars_vertex>
  #include <fog_pars_vertex>
  #include <normal_pars_vertex>
  #include <shadowmap_pars_vertex>
  #include <clipping_planes_pars_vertex>
  uniform float uTime;
  uniform float time_s;
  uniform sampler2D positionTexture;
  uniform sampler2D velocityTexture;
  uniform vec4 rotationAnimation;
  uniform sampler2D restPositionTexture;
  uniform vec4 uProgress;
  
  varying float vVelocityLength;
  varying float vOpacity;
  uniform float forceScale;
  float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }
  
  vec3 rotateAxisAngle(vec3 v, vec3 axis, float angle) {
    return (cos(angle) * v) + (sin(angle) * cross(axis, v)) + ((1.0 - cos(angle)) * dot(axis, v) * axis);
  }
  
  void main() {
    vec3 restPosition = instanceMatrix[3].xyz;
    vec3 instanceInfo = vec3(instanceMatrix[0][3], instanceMatrix[1][3], instanceMatrix[2][3]);
    mat4 _instanceMatrix = instanceMatrix;
    _instanceMatrix[0][3] = 0.0;
    _instanceMatrix[1][3] = 0.0;
    _instanceMatrix[2][3] = 0.0;
    #define instanceMatrix _instanceMatrix
  
    vec2 dataTextureUV = instanceInfo.xy;
    vec4 restPos2 = texture2D(restPositionTexture, dataTextureUV);
    float random = hash13(restPos2.xyz);
  
    vec4 positionTextureSample = texture2D(positionTexture, dataTextureUV);
    vec4 velocityTextureSample = texture2D(velocityTexture, dataTextureUV);
  
    vVelocityLength = length(velocityTextureSample.xyz);
    float animation = 1. - velocityTextureSample.w;
    vOpacity = 1. - positionTextureSample.w; //animation;//getAnimationOpacity(animation);
  
    #include <uv_vertex>
    #include <color_vertex>
    #include <beginnormal_vertex>

    // Particle rotation angle and axis based on random values and time.
    float particleAngle = 0.0;
  
    if (rotationAnimation.x > random) {
      float randomAngle = (uTime * random * 1.0 + random * 111.0);
      particleAngle = mod(randomAngle + PI, PI2) - PI;
      particleAngle = particleAngle / PI;
      particleAngle = sign(particleAngle) * pow(abs(particleAngle), 1.0 / rotationAnimation.x);
      particleAngle = particleAngle * PI - PI;
    }
  
    vec3 particleRotationAxis = vec3(cos(random * -34.4), sin(random * -34.4), 0.0);
    particleRotationAxis = normalize(mix(particleRotationAxis, vec3(1.0, 0.0, 0.0), 0.65));
  
    // Apply rotation to the object if animation is enabled.
    // higher x value make higher filer particle to rotate
    if (rotationAnimation.x > 0.0) {
      objectNormal = rotateAxisAngle(objectNormal, particleRotationAxis, particleAngle);
    }
  
    #include <defaultnormal_vertex>
    #include <normal_vertex>
  
    #include <begin_vertex>
  
    if (rotationAnimation.x > 0.0) {
      transformed = rotateAxisAngle(transformed, particleRotationAxis, particleAngle);
    }
  
    transformed *= forceScale;
    if (rotationAnimation.x > 0.0) {
      //objectNormal = rotateAxisAngle(objectNormal, particleRotationAxis, particleAngle);
    }
  
    vec4 mvPosition = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
    #endif
  
    vec3 distanceToCenter = mvPosition.xyz - restPosition;
    vec3 distanceToCenterStretched = distanceToCenter * mix(1.0, .01, length(distanceToCenter));
    //distanceToCenterStretched*=1.-vOpacity*2.;
    mvPosition.xyz = restPosition + distanceToCenterStretched ;

    mvPosition.xyz = positionTextureSample.xyz + distanceToCenterStretched;
    // mvPosition.xyz += positionTextureSample.xyz;
  
    mvPosition.xyz = mix(mvPosition.xyz, mvPosition.xyz * 1.1, velocityTextureSample.w);
  
    mvPosition = modelViewMatrix * mvPosition;
  
    gl_Position = projectionMatrix * mvPosition;
  
    #include <clipping_planes_vertex>
  
    vViewPosition = -mvPosition.xyz;
  
    #include <worldpos_vertex>
    #include <shadowmap_vertex>
  
    #include <fog_vertex>
  
    #ifdef USE_TRANSMISSION
    vWorldPosition = worldPosition.xyz;
    #endif
  }  
  `
 }
 
 get fragmentShader (){
return `
#define STANDARD
#ifdef PHYSICAL
    #define IOR
    #define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
    uniform float ior;
#endif
#ifdef USE_SPECULAR
    uniform float specularIntensity;
    uniform vec3 specularColor;
    #ifdef USE_SPECULAR_COLORMAP
        uniform sampler2D specularColorMap;
    #endif
    #ifdef USE_SPECULAR_INTENSITYMAP
        uniform sampler2D specularIntensityMap;
    #endif
#endif
#ifdef USE_CLEARCOAT
    uniform float clearcoat;
    uniform float clearcoatRoughness;
#endif
#ifdef USE_IRIDESCENCE
    uniform float iridescence;
    uniform float iridescenceIOR;
    uniform float iridescenceThicknessMinimum;
    uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
    uniform vec3 sheenColor;
    uniform float sheenRoughness;
    #ifdef USE_SHEEN_COLORMAP
        uniform sampler2D sheenColorMap;
    #endif
    #ifdef USE_SHEEN_ROUGHNESSMAP
        uniform sampler2D sheenRoughnessMap;
    #endif
#endif
#ifdef USE_ANISOTROPY
    uniform vec2 anisotropyVector;
    #ifdef USE_ANISOTROPYMAP
        uniform sampler2D anisotropyMap;
    #endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <clipping_planes_pars_fragment>

varying float vVelocityLength;
varying float vOpacity;

void main() {
    #include <clipping_planes_fragment>

    float velocityBrightenMultiplier =vVelocityLength * 0.5 ;
    vec4 diffuseColor = vec4(
        diffuse * (1.0 + velocityBrightenMultiplier),
        min((opacity + velocityBrightenMultiplier), 1.0) *vOpacity
    );  

    // diffuseColor = vec4(diffuse,vOpacity);  
    ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
    vec3 totalEmissiveRadiance = emissive;

    #include <map_fragment>
    #include <color_fragment>
    #include <alphamap_fragment>
    #include <alphatest_fragment>
    #include <alphahash_fragment>
    #include <roughnessmap_fragment>
    #include <metalnessmap_fragment>
    #include <normal_fragment_begin>
    #include <normal_fragment_maps>
    #include <clearcoat_normal_fragment_begin>
    #include <clearcoat_normal_fragment_maps>
    #include <emissivemap_fragment>
    #include <lights_physical_fragment>
    #include <lights_fragment_begin>
    #include <lights_fragment_maps>
    #include <lights_fragment_end>
    #include <aomap_fragment>

    vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
    vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;

    #include <transmission_fragment>

    vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;

    #ifdef USE_SHEEN
        float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
        outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecular;
    #endif

    #ifdef USE_CLEARCOAT
        float dotNVcc = saturate( dot( geometry.clearcoatNormal, geometry.viewDir ) );
        vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
        outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + clearcoatSpecular * material.clearcoat;
    #endif

    #include <opaque_fragment>
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
    #include <premultiplied_alpha_fragment>
    #include <dithering_fragment>
    // gl_FragColor = vec4(vColor.rgb,1.);
}
`
 }
}


