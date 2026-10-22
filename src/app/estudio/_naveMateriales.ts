import * as THREE from "three";

// Terminación de la nave: luz de borde, el entorno que reflejan los metales, texturas pintadas en
// canvas y el último paso de la imagen. Todo procedural: no se baja ningún archivo.

/** Uniform compartido: varios materiales pueden apuntar al mismo y cambian de color juntos. */
export type ColorCompartido = { value: THREE.Color };

/**
 * Luz de borde (fresnel): el contorno de cada objeto se ilumina en el color de la paleta. Es lo que
 * separa a los personajes del fondo oscuro. Se suma como luz propia, así que no depende de las luces
 * de la escena.
 */
export function conBorde<M extends THREE.MeshStandardMaterial>(material: M, color: ColorCompartido, fuerza = 1, potencia = 2.5): M {
  const fuerzaBorde = { value: fuerza };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uColorBorde = color;
    shader.uniforms.uFuerzaBorde = fuerzaBorde;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uColorBorde;\nuniform float uFuerzaBorde;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float borde = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), ${potencia.toFixed(2)});
        totalEmissiveRadiance += uColorBorde * borde * uFuerzaBorde;`
      );
  };
  // Sin esto, three compartiría el programa entre bordes de distinta potencia.
  material.customProgramCacheKey = () => `borde-${potencia.toFixed(2)}`;
  return material;
}

/**
 * El "estudio" que reflejan los metales y el vidrio: una sala oscura con un softbox arriba y tiras
 * de neón a los costados. Se arma una sola vez con PMREM (prefiltrado por rugosidad).
 */
export function crearEntorno(renderer: THREE.WebGLRenderer): THREE.Texture {
  const sala = new THREE.Scene();
  const geometrias: THREE.BufferGeometry[] = [];
  const materiales: THREE.Material[] = [];

  const paredes = new THREE.BoxGeometry(30, 30, 30);
  const matParedes = new THREE.MeshBasicMaterial({ color: 0x05080a, side: THREE.BackSide });
  geometrias.push(paredes);
  materiales.push(matParedes);
  sala.add(new THREE.Mesh(paredes, matParedes));

  const plano = new THREE.PlaneGeometry(1, 1);
  geometrias.push(plano);
  const panel = (color: number, intensidad: number, ancho: number, alto: number, x: number, y: number, z: number) => {
    const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    // Más de 1: es una fuente de luz, no una pared pintada.
    material.color.multiplyScalar(intensidad);
    materiales.push(material);
    const malla = new THREE.Mesh(plano, material);
    malla.scale.set(ancho, alto, 1);
    malla.position.set(x, y, z);
    malla.lookAt(0, 0, 0);
    sala.add(malla);
  };
  panel(0xffffff, 2, 12, 6, 0, 13, -2); // softbox arriba, apenas hacia atrás
  // Tiras finas alrededor, a media altura: en el cromo curvo se ven como líneas de reflejo nítidas.
  for (const [x, z] of [
    [0, 13],
    [0, -13],
    [13, 0],
    [-13, 0],
  ]) {
    panel(0xe8f4ff, 1.3, 22, 0.5, x, 4, z);
  }
  panel(0x8cff59, 3, 2, 16, -13, 2, -2); // tira verde a la izquierda
  panel(0xff4fd8, 2.4, 2, 16, 13, 2, -2); // tira rosa a la derecha
  panel(0x9fd8ff, 1.4, 20, 1.2, 0, -2, -13); // línea fría de horizonte, atrás
  panel(0x16301a, 1, 26, 26, 0, -13, 0); // piso apenas verde

  const pmrem = new THREE.PMREMGenerator(renderer);
  const textura = pmrem.fromScene(sala, 0.03).texture;
  pmrem.dispose();
  geometrias.forEach((g) => g.dispose());
  materiales.forEach((m) => m.dispose());
  return textura;
}

function lienzo(ancho: number, alto: number) {
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  return { canvas, ctx: canvas.getContext("2d") };
}

/** Gigante gaseoso: bandas horizontales con turbulencia, en tonos de un color base. */
export function crearTexturaPlaneta(base: number, semilla: number): THREE.CanvasTexture {
  const ANCHO = 256;
  const ALTO = 128;
  const { canvas, ctx } = lienzo(ANCHO, ALTO);
  if (ctx) {
    const imagen = ctx.createImageData(ANCHO, ALTO);
    const hsl = { h: 0, s: 0, l: 0 };
    new THREE.Color(base).getHSL(hsl, THREE.SRGBColorSpace);
    const pixel = new THREE.Color();
    const rgb = { r: 0, g: 0, b: 0 };
    for (let y = 0; y < ALTO; y++) {
      const v = y / ALTO;
      const banda = Math.sin(v * 22 + semilla) * 0.5 + Math.sin(v * 51 + semilla * 2.3) * 0.3 + Math.sin(v * 9 + semilla * 0.7) * 0.2;
      for (let x = 0; x < ANCHO; x++) {
        // La turbulencia da la vuelta entera (2π en el ancho): sin costura en la esfera.
        const u = (x / ANCHO) * Math.PI * 2;
        const remolino = Math.sin(u * 3 + v * 30 + semilla) * 0.05 + Math.sin(u * 7 - v * 18) * 0.025;
        const l = THREE.MathUtils.clamp(hsl.l + (banda + remolino) * 0.16, 0.05, 0.85);
        pixel.setHSL((hsl.h + banda * 0.025 + 1) % 1, hsl.s, l, THREE.SRGBColorSpace).getRGB(rgb, THREE.SRGBColorSpace);
        const i = (y * ANCHO + x) * 4;
        imagen.data[i] = Math.round(rgb.r * 255);
        imagen.data[i + 1] = Math.round(rgb.g * 255);
        imagen.data[i + 2] = Math.round(rgb.b * 255);
        imagen.data[i + 3] = 255;
      }
    }
    ctx.putImageData(imagen, 0, 0);
  }
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

/** Anillo de planeta: la RingGeometry mapea en plano, así que se pintan círculos concéntricos. */
export function crearTexturaAnillo(): THREE.CanvasTexture {
  const { canvas, ctx } = lienzo(256, 256);
  if (ctx) {
    const interior = (1.4 / 2.1) * 128;
    for (let r = interior; r < 128; r += 1) {
      const t = (r - interior) / (128 - interior);
      const alfa = (0.25 + 0.5 * Math.abs(Math.sin(t * 19)) * (0.6 + 0.4 * Math.sin(t * 7))) * Math.sin(t * Math.PI);
      ctx.strokeStyle = `rgba(225, 215, 255, ${alfa.toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(128, 128, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

/**
 * Último paso de la imagen: viñeta suave (lleva la mirada al centro) y dithering para que los
 * degradés oscuros del fondo no se vean en escalones. El ruido es fijo por píxel: no titila.
 */
export const SHADER_TERMINACION = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uVineta: { value: 0.5 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVineta;
    varying vec2 vUv;
    float ruido(vec2 c) {
      return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float distancia = length((vUv - 0.5) * vec2(1.0, 0.85));
      color.rgb *= 1.0 - uVineta * smoothstep(0.28, 0.78, distancia);
      color.rgb += (ruido(gl_FragCoord.xy) - 0.5) / 255.0;
      gl_FragColor = color;
    }`,
};
