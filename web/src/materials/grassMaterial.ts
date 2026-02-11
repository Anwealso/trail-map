import * as THREE from "three";

export function createGrassMaterial() {
  const mat = new THREE.MeshPhongMaterial({
    color: "#4e9a06",
    side: THREE.DoubleSide,
    transparent: true,
  });

  // Add uniforms to mat so we can update them in useFrame
  mat.userData.uTime = { value: 0 };

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = mat.userData.uTime;

    shader.vertexShader = `
      varying float vFade;
      varying vec2 vBladeUv;
      
      vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
      vec2 fade(vec2 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

      float cnoise(vec2 P) {
        vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
        vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
        Pi = mod(Pi, 289.0);
        vec4 ix = Pi.xzxz;
        vec4 iy = Pi.yyww;
        vec4 fx = Pf.xzxz;
        vec4 fy = Pf.yyww;
        vec4 i = permute(permute(ix) + iy);
        vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0;
        vec4 gy = abs(gx) - 0.5;
        vec4 tx = floor(gx + 0.5);
        gx = gx - tx;
        vec2 g00 = vec2(gx.x,gy.x);
        vec2 g10 = vec2(gx.y,gy.y);
        vec2 g01 = vec2(gx.z,gy.z);
        vec2 g11 = vec2(gx.w,gy.w);
        vec4 norm = 1.79284291400159 - 0.85373472095314 * 
          vec4(dot(g00, g00), dot(g10, g10), dot(g01, g01), dot(g11, g11));
        g00 *= norm.x;
        g10 *= norm.y;
        g01 *= norm.z;
        g11 *= norm.w;
        float n00 = dot(g00, fx.xy);
        float n10 = dot(g10, fx.zw);
        float n01 = dot(g01, fy.xy);
        float n11 = dot(g11, fy.zw);
        vec2 fade_xy = fade(Pf.xy);
        vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
        float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
        return 2.3 * n_xy;
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 rot = mat2(1.6, 1.2, -1.2, 1.6);
        for (int i = 0; i < 3; i++) {
          v += a * cnoise(p);
          p = rot * p * 2.0;
          a *= 0.5;
        }
        return v;
      }
      
      uniform float uTime;
      ${shader.vertexShader}
    `.replace(
      "#include <begin_vertex>",
      `
      #include <begin_vertex>
      
      vBladeUv = uv;
      
      // Calculate edge fade (matching Terrain.tsx logic)
      // instanceMatrix is provided automatically by Three.js when USE_INSTANCING is active
      vec3 instancePos = instanceMatrix[3].xyz;
      float radius = 5.0;
      float centerX = 5.0;
      float centerZ = 5.0;
      float fadeWidth = radius * 0.2;
      
      float dx = instancePos.x - centerX;
      float dz = instancePos.z - centerZ;
      float dist = sqrt(dx * dx + dz * dz);
      
      float t = (dist - (radius - fadeWidth)) / fadeWidth;
      float smoothstepFade = clamp(t, 0.0, 1.0);
      smoothstepFade = smoothstepFade * smoothstepFade * (3.0 - 2.0 * smoothstepFade);
      vFade = 1.0 - smoothstepFade;
      
      // Wind motion
      vec2 windUV = instancePos.xz * 0.4 + vec2(uTime * 0.08, uTime * 0.04);
      float windNoise = fbm(windUV);
      float gusts = fbm(windUV * 2.5 - uTime * 0.06) * 0.4;
      float windStrength = (windNoise + gusts) * 0.5 + 0.5;
      
      float leanFactor = pow(uv.y, 1.5) * (0.1 + windStrength * 0.5); 
      float origY = transformed.y;
      
      float angle = windNoise * 0.5; 
      float dirX = cos(angle);
      float dirZ = sin(angle + 0.5);

      float leanDist = leanFactor * 0.04; 
      transformed.x += leanDist * dirX;
      transformed.z += leanDist * dirZ;
      transformed.y = sqrt(max(0.0, origY * origY - leanDist * leanDist));
      `
    );

    shader.fragmentShader = `
      varying float vFade;
      varying vec2 vBladeUv;
      ${shader.fragmentShader}
    `.replace(
      "#include <opaque_fragment>",
      `
      // Custom grass coloring
      vec3 bottomColor = vec3(0.05, 0.15, 0.02);
      vec3 tipColor = vec3(0.4, 0.7, 0.2);
      vec3 color = mix(bottomColor, tipColor, vBladeUv.y);
      
      float ao = smoothstep(0.0, 0.4, vBladeUv.y) * 0.6 + 0.4;
      float tipHighlight = smoothstep(0.7, 1.0, vBladeUv.y) * 0.2;
      color += tipHighlight * vec3(0.8, 1.0, 0.5);
      
      // Update diffuseColor (standard for MeshPhongMaterial)
      diffuseColor.rgb = color * ao;
      
      #include <opaque_fragment>
      
      // Apply transparency fade
      gl_FragColor.a *= vFade;
      if (gl_FragColor.a < 0.05) discard;
      `
    );
  };

  return mat;
}
