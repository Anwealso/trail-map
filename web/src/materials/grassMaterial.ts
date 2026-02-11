import * as THREE from "three";

export function createGrassMaterial() {
  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vInstancePos;
    varying float vFade;
    uniform float uTime;
    
    //
    // GLSL textureless classic 2D noise "cnoise",
    // requires 1 input (vec2) and returns 1 output (float).
    //
    vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    vec2 fade(vec2 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

    float cnoise(vec2 P) {
      vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
      vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
      Pi = mod(Pi, 289.0); // To avoid truncation effects in permutation
      vec4 ix = Pi.xzxz;
      vec4 iy = Pi.yyww;
      vec4 fx = Pf.xzxz;
      vec4 fy = Pf.yyww;
      vec4 i = permute(permute(ix) + iy);
      vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0; // 1/41 = 0.024...
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

    void main() {
      vUv = uv;
      
      // Get world position from instance matrix
      vec3 instancePos = instanceMatrix[3].xyz;
      vInstancePos = instancePos;

      // Calculate edge fade (matching Terrain.tsx logic)
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
      
      // Wind motion using FBM for organic feel

      vec2 windUV = instancePos.xz * 0.4 + vec2(uTime * 0.08, uTime * 0.04);
      float windNoise = fbm(windUV);
      
      // Add a secondary, faster layer for "gusts"
      float gusts = fbm(windUV * 2.5 - uTime * 0.06) * 0.4;
      
      float windStrength = (windNoise + gusts) * 0.5 + 0.5;
      
      // Displacement depends on height (vUv.y)
      float displacement = pow(vUv.y, 2.0) * windStrength * 0.18;
      
      vec3 pos = position;
      // Add a slight tilt even without wind
      pos.x += sin(instancePos.x * 10.0 + instancePos.z * 5.0) * 0.02 * vUv.y;
      
      // Apply wind displacement in a semi-random direction influenced by noise
      float angle = windNoise * 0.5; 
      pos.x += displacement * cos(angle);
      pos.z += displacement * sin(angle + 0.5);

      // Transform to world space
      vec4 worldPosition = instanceMatrix * vec4(pos, 1.0);
      
      // Standard MVP transformation
      gl_Position = projectionMatrix * modelViewMatrix * worldPosition;
    }
  `;

  const fragmentShader = `
    varying vec2 vUv;
    varying vec3 vInstancePos;
    varying float vFade;
    
    float rand(vec2 co){
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    void main() {
      // Per-instance color variation
      float variation = rand(vInstancePos.xz);
      
      // Grass colors
      vec3 bottomColor = vec3(0.05, 0.15, 0.02); // Darker base
      vec3 green1 = vec3(0.2, 0.5, 0.1);
      vec3 green2 = vec3(0.4, 0.7, 0.2);
      vec3 tipColor = mix(green1, green2, variation);
      
      // Vertical gradient
      vec3 color = mix(bottomColor, tipColor, vUv.y);
      
      // Simple darkening at the bottom for ambient occlusion look
      float ao = smoothstep(0.0, 0.4, vUv.y) * 0.6 + 0.4;
      
      // Add some "sunlight" effect on the tips
      float tipHighlight = smoothstep(0.7, 1.0, vUv.y) * 0.2;
      color += tipHighlight * vec3(0.8, 1.0, 0.5);
      
      gl_FragColor = vec4(color * ao, vFade);
      
      // Alpha test to prevent depth sorting issues with low alpha
      if (gl_FragColor.a < 0.05) discard;
    }
  `;

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
    },
    side: THREE.DoubleSide,
    transparent: true,
  });
}
