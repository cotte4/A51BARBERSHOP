"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { GEO, type Energia } from "./_escena";
import { crearLimitador60 } from "./_movimiento";

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// Un solo pase: rayo volumétrico + lava (metaballs) + partículas que suben.
// Coordenadas p en 0..1 con y hacia abajo, como el DOM.
const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform float uHaz;
uniform float uAlcance;
uniform float uY0;
uniform float uY1;
uniform float uHw0;
uniform float uHw1;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 p = vec2(frag.x / uRes.x, 1.0 - frag.y / uRes.y);
  float asp = uRes.x / uRes.y;
  float t = uTime;

  float k = clamp((p.y - uY0) / (uY1 - uY0), 0.0, 1.0);
  float hw = mix(uHw0, uHw1, k);
  float a = (p.x - 0.5) / hw;

  float arriba = smoothstep(uY0 - 0.01, uY0 + 0.025, p.y);
  float abajo = 1.0 - smoothstep(uY1 - 0.02, uY1 + 0.05, p.y);
  float frente = 1.0 - smoothstep(uAlcance - 0.08, uAlcance, k);
  float vertical = arriba * abajo * frente;
  float cono = (1.0 - smoothstep(0.72, 1.0, abs(a))) * vertical;

  vec3 verde = vec3(0.549, 1.0, 0.349);
  vec3 claro = vec3(0.86, 1.0, 0.78);
  vec3 col = vec3(0.0);

  // Luz que se escapa del cono (la atmósfera también se ilumina).
  float fuga = exp(-max(abs(a) - 0.85, 0.0) * 3.2) * (1.0 - k * 0.4) * vertical;
  col += verde * 0.07 * fuga;

  if (cono > 0.001) {
    float nucleo = exp(-a * a * 3.6);
    float rayos = 0.5 + 0.5 * sin(a * 17.0 + noise(vec2(a * 3.0, t * 0.22)) * 6.0);
    float flujo = noise(vec2(a * 4.5, k * 6.5 + t * 0.85));
    float haz = (0.16 + 0.5 * nucleo) * mix(1.0, 0.5, k);
    haz *= 0.78 + 0.22 * rayos * mix(0.35, 1.0, k);
    haz *= 0.72 + 0.5 * flujo;
    col += verde * haz * cono;

    // Partículas que el rayo chupa hacia la nave: tamaños y velocidades variables.
    for (int j = 0; j < 22; j++) {
      float fj = float(j);
      float vel = 0.07 + 0.07 * fract(fj * 0.381);
      float ph = fract(t * vel + fract(fj * 0.618));
      float kk = 1.0 - ph * ph;
      float lado = (fract(fj * 0.773) * 2.0 - 1.0) * 0.72 + sin(t * 1.1 + fj * 1.7) * 0.07;
      vec2 c = vec2(0.5 + lado * mix(uHw0, uHw1, kk), mix(uY0, uY1, kk));
      float s = 0.0022 + 0.0055 * pow(fract(fj * 0.519), 2.0);
      vec2 d = vec2((p.x - c.x) * asp, p.y - c.y);
      float d2 = dot(d, d);
      float vida = smoothstep(0.0, 0.12, ph) * (1.0 - smoothstep(0.78, 1.0, ph));
      col += claro * vida * (exp(-d2 / (s * s)) * 0.85 + exp(-d2 / (s * s * 10.0)) * 0.18) * frente;
    }
  }

  // Lava: una pileta en el piso, otra pegada a la nave y gotas que suben entre las dos.
  float lavaZona = (1.0 - smoothstep(0.88, 1.12, abs(a))) * arriba
    * (1.0 - smoothstep(uY1 + 0.03, uY1 + 0.08, p.y)) * frente;
  if (lavaZona > 0.001) {
    float f = 0.0;
    // Pileta del piso: ancha y ondulante (la superficie se mueve con ruido).
    float ola = noise(vec2(p.x * 9.0 + t * 0.4, t * 0.3)) - 0.5;
    vec2 dp = vec2((p.x - 0.5) / (uHw1 * 0.78), (p.y - uY1 - 0.03 + ola * 0.025) / 0.07);
    f += 1.0 / max(dot(dp, dp), 1e-4);
    vec2 dn = vec2((p.x - 0.5) / (uHw0 * 1.6), (p.y - uY0 - 0.004) / 0.024);
    f += 0.9 / max(dot(dn, dn), 1e-4);
    // Gotas: nacen como un bulto en la pileta, se estiran (cuello) y se sueltan; suben lento y
    // la nave las absorbe arriba. Nunca aparecen ni desaparecen de golpe.
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      float vel = 0.026 + 0.016 * fract(fi * 0.618);
      float ph = fract(t * vel + fi / 7.0 + 0.09 * fract(fi * 0.37));
      float sube = ph * ph * (3.0 - 2.0 * ph);
      float kk = 1.0 - sube;
      float deriva = sin(t * (0.13 + 0.05 * fi) + fi * 2.3) * 0.42 + sin(t * 0.07 + fi) * 0.12;
      vec2 c = vec2(0.5 + deriva * mix(uHw0, uHw1, kk) * smoothstep(0.0, 0.25, ph + 0.08),
                    mix(uY0, uY1 + 0.03, kk));
      float r = (0.04 + 0.032 * fract(fi * 0.73)) * mix(0.55, 1.0, kk)
        * smoothstep(0.0, 0.14, ph) * (1.0 - smoothstep(0.82, 1.0, ph));
      // Gotas apenas ovaladas en la dirección del movimiento: se leen como fluido, no como bolas.
      vec2 d = vec2((p.x - c.x) * asp, (p.y - c.y) * 0.86);
      f += r * r / max(dot(d, d), 1e-5);
    }
    float textura = 0.86 + 0.28 * noise(vec2(p.x * asp, p.y) * 7.0 + vec2(0.0, t * 0.3));
    float cuerpo = smoothstep(0.92, 1.08, f);
    float interior = smoothstep(1.2, 6.0, f);
    float borde = cuerpo * (1.0 - smoothstep(1.08, 1.5, f));
    float aura = clamp(f * 0.12, 0.0, 0.28) * (1.0 - cuerpo);
    col += verde * (cuerpo * (0.24 + 0.26 * interior) * textura + borde * 0.22 + aura * 0.45) * lavaZona;
    col += claro * interior * interior * 0.22 * lavaZona;
  }

  col *= uHaz;
  // Dither: mata el banding de los degradés oscuros.
  col = max(col + (hash(frag + fract(t)) - 0.5) / 255.0 * 1.5, 0.0);
  col = min(col, vec3(1.0));
  // Luz aditiva con alpha premultiplicado: donde no hay luz, el lienzo es transparente.
  float alfa = max(col.r, max(col.g, col.b));
  gl_FragColor = vec4(col, alfa);
}
`;

function compilar(gl: WebGLRenderingContext, tipo: number, fuente: string): WebGLShader | null {
  const s = gl.createShader(tipo);
  if (!s) return null;
  gl.shaderSource(s, fuente);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s);
    return null;
  }
  return s;
}

/**
 * El rayo tractor y la lava de luz, en WebGL puro (sin three). Sale con alpha premultiplicado
 * (alfa = canal más brillante), que sobre el fondo oscuro se comporta como luz que se suma.
 * Corre a la mitad de la resolución: es luz difusa, no hace falta más, y rinde en cualquier equipo.
 */
export default function RayoLava({
  energia,
  quieto,
}: {
  energia: RefObject<Energia>;
  quieto: boolean;
}) {
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    // Cada montaje crea su propio lienzo: al desmontar se libera el contexto de la GPU y un
    // lienzo con el contexto perdido no se puede reusar (StrictMode, cambio de reduced-motion).
    const canvas = document.createElement("canvas");
    canvas.className = "torneo-escena-lava";
    el.appendChild(canvas);
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    });
    if (!gl) {
      canvas.remove();
      return;
    }
    const vs = compilar(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compilar(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) {
      canvas.remove();
      return;
    }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.remove();
      return;
    }
    gl.useProgram(prog);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = u("uRes");
    const uTime = u("uTime");
    const uHaz = u("uHaz");
    const uAlcance = u("uAlcance");
    const uY0 = u("uY0");
    const uY1 = u("uY1");
    gl.uniform1f(u("uHw0"), GEO.anchoEmisor);
    gl.uniform1f(u("uHw1"), GEO.anchoPiso);

    // Arranca a mitad de un ciclo para que la lava ya esté "viva" en el primer cuadro.
    const desfase = 14;
    const inicio = performance.now();
    let t = desfase;

    const dibujar = () => {
      gl.uniform1f(uTime, t);
      gl.uniform1f(uHaz, energia.current.haz);
      gl.uniform1f(uAlcance, energia.current.alcance);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const ajustar = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      const escala = Math.min(window.devicePixelRatio || 1, 2) * 0.55;
      canvas.width = Math.round(width * escala);
      canvas.height = Math.round(height * escala);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      // La geometría está en unidades del ancho (cqw): se pasa a fracción del alto.
      const enAlto = width / height / 100;
      gl.uniform1f(uY0, GEO.yEmisor * enAlto);
      gl.uniform1f(uY1, 1 - GEO.margenPiso * enAlto);
      dibujar();
    };
    const observador = new ResizeObserver(ajustar);
    observador.observe(canvas);
    ajustar();

    if (quieto) {
      return () => {
        observador.disconnect();
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        canvas.remove();
      };
    }

    let enPantalla = true;
    const io = new IntersectionObserver(([e]) => {
      enPantalla = e.isIntersecting;
    });
    io.observe(canvas);

    let cuadro = 0;
    // Tope de 60 fps también en pantallas de 120/144 Hz (es luz difusa: más cuadros no se notan).
    const toca = crearLimitador60();
    const bucle = (ahora: number) => {
      cuadro = requestAnimationFrame(bucle);
      if (document.hidden || !enPantalla || !toca(ahora)) return;
      t = desfase + (ahora - inicio) / 1000;
      dibujar();
    };
    cuadro = requestAnimationFrame(bucle);

    return () => {
      cancelAnimationFrame(cuadro);
      observador.disconnect();
      io.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [energia, quieto]);

  return <div ref={contenedor} className="torneo-escena-lava" />;
}
