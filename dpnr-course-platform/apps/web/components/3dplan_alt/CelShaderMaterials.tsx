import { ShaderMaterial, Color, Vector3, DoubleSide } from 'three';
import { extend } from '@react-three/fiber';

// Cel-shaded tree material
export class CelTreeMaterial extends ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        color: { value: new Color(0.3, 0.6, 0.2) },
        lightDirection: { value: new Vector3(1, 1, 0.5).normalize() },
        bands: { value: 4.0 },
        outline: { value: 0.02 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform vec3 lightDirection;
        uniform float bands;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          float intensity = dot(vNormal, lightDirection);
          intensity = max(0.0, intensity);
          
          // Quantize lighting into bands
          float quantized = floor(intensity * bands) / bands;
          quantized = max(0.2, quantized); // Minimum ambient
          
          // Add some variation based on position
          float variation = sin(vPosition.x * 0.5) * sin(vPosition.z * 0.5) * 0.1;
          
          vec3 finalColor = color * (quantized + variation);
          
          // Add slight color variation for leaves
          finalColor.g += sin(vPosition.y * 0.3) * 0.1;
          finalColor.r += cos(vPosition.x * 0.2) * 0.05;
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });
  }
}

// Cel-shaded trunk material
export class CelTrunkMaterial extends ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        color: { value: new Color(0.4, 0.25, 0.15) },
        lightDirection: { value: new Vector3(1, 1, 0.5).normalize() },
        bands: { value: 3.0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform vec3 lightDirection;
        uniform float bands;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          float intensity = dot(vNormal, lightDirection);
          intensity = max(0.0, intensity);
          
          // Quantize lighting
          float quantized = floor(intensity * bands) / bands;
          quantized = max(0.15, quantized);
          
          // Add bark texture variation
          float barkNoise = sin(vPosition.y * 2.0) * cos(vPosition.x * 3.0) * 0.1;
          
          vec3 finalColor = color * (quantized + barkNoise);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });
  }
}

// Cel-shaded butterfly material
export class CelButterflyMaterial extends ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        time: { value: 0 },
        color1: { value: new Color(1.0, 0.6, 0.2) },
        color2: { value: new Color(0.8, 0.2, 0.8) },
        lightDirection: { value: new Vector3(1, 1, 0.5).normalize() },
        bands: { value: 3.0 },
      },
      vertexShader: `
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vUv = uv;
          
          // Wing flutter animation
          vec3 pos = position;
          float flutter = sin(time * 10.0) * 0.1;
          pos.y += flutter * abs(uv.x - 0.5);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 lightDirection;
        uniform float bands;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        
        void main() {
          float intensity = dot(vNormal, lightDirection);
          intensity = max(0.0, intensity);
          
          // Quantize lighting
          float quantized = floor(intensity * bands) / bands;
          quantized = max(0.3, quantized);
          
          // Wing pattern
          float pattern = smoothstep(0.3, 0.7, sin(vUv.x * 3.14159) * sin(vUv.y * 3.14159));
          vec3 wingColor = mix(color1, color2, pattern);
          
          // Iridescent shimmer
          float shimmer = sin(time + vPosition.x + vPosition.y) * 0.2 + 0.8;
          
          vec3 finalColor = wingColor * quantized * shimmer;
          
          gl_FragColor = vec4(finalColor, 0.9);
        }
      `,
      side: DoubleSide,
      transparent: true,
    });
  }
}

// Outline material for bold edges
export class OutlineMaterial extends ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        color: { value: new Color(0.1, 0.1, 0.1) },
        thickness: { value: 0.003 },
      },
      vertexShader: `
        uniform float thickness;
        
        void main() {
          vec3 pos = position + normal * thickness;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        
        void main() {
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: DoubleSide,
    });
  }
}

// Extend materials for R3F
extend({ 
  CelTreeMaterial, 
  CelTrunkMaterial, 
  CelButterflyMaterial, 
  OutlineMaterial 
});

declare global {
  namespace JSX {
    interface IntrinsicElements {
      celTreeMaterial: any;
      celTrunkMaterial: any;
      celButterflyMaterial: any;
      outlineMaterial: any;
    }
  }
}