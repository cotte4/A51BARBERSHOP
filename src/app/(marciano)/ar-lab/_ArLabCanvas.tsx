"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { FACE_TRIS } from "@/lib/face-mesh-tris";

type Lm = { x: number; y: number; z: number };

// Face oval silhouette — 36 landmark indices that form the outer boundary of the face mesh
const FACE_OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109] as const;
const OVAL_N    = FACE_OVAL.length; // 36
const SKIRT_OUT     = 2.5;  // how far outer ring extends beyond face oval
const SKIRT_UV_EXT  = 0.45; // push outer UV into avatar extended areas (hair/chin)

const BLINK_OPEN = 0.25, BLINK_CLOSE = 0.06;
const EXPR_A = 0.30;
const SMOOTH = 0.55;

const PRESETS = [
  { label: "Francisco", src: "/ar-test/avatar-francisco-nobg.png" },
  { label: "Lautaro",   src: "/ar-test/avatar-lautaro-nobg.png"   },
] as const;
type Preset = { label: string; src: string };

type AlienBounds = { cx: number; cy: number; contentH: number; contentW: number; iW: number; iH: number };

function detectContentBounds(img: HTMLImageElement): AlienBounds {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  let minX=c.width, maxX=0, minY=c.height, maxY=0;
  for (let i=0; i<data.length; i+=4) {
    if (data[i+3]>15) {
      const px=(i/4)%c.width, py=Math.floor((i/4)/c.width);
      if(px<minX)minX=px; if(px>maxX)maxX=px;
      if(py<minY)minY=py; if(py>maxY)maxY=py;
    }
  }
  return {
    cx: (minX+maxX)/2, cy: (minY+maxY)/2,
    contentH: (maxY>0?maxY:c.height)-(minY<c.height?minY:0)||c.height,
    contentW: (maxX>0?maxX:c.width)-(minX<c.width?minX:0)||c.width,
    iW: img.naturalWidth, iH: img.naturalHeight,
  };
}

function dist2(a: Lm, b: Lm, W: number, H: number) {
  return Math.hypot((b.x-a.x)*W, (b.y-a.y)*H);
}

// EAR / MAR helpers
const LM_IDX = {
  EYE_L_OUT:33, EYE_L_IN:133, EYE_L_UP:159, EYE_L_DN:145,
  EYE_R_OUT:263, EYE_R_IN:362, EYE_R_UP:386, EYE_R_DN:374,
  MOUTH_L:61, MOUTH_R:291, LIP_UP:13, LIP_DN:14,
} as const;

function earVal(lms: Lm[], W: number, H: number, up: number, dn: number, out: number, inn: number) {
  const h = dist2(lms[up],lms[dn],W,H);
  const w = dist2(lms[out],lms[inn],W,H);
  return w>0 ? h/w : 0.25;
}
function marVal(lms: Lm[], W: number, H: number) {
  return dist2(lms[LM_IDX.LIP_UP],lms[LM_IDX.LIP_DN],W,H) /
    Math.max(dist2(lms[LM_IDX.MOUTH_L],lms[LM_IDX.MOUTH_R],W,H), 0.001);
}

// ── TPS (Thin-Plate Spline) mapping ──────────────────────────────────────────
type Pt2 = [number, number];
interface AvatarAnchors { pts: Pt2[]; }   // pts[i] = avatar pixel for CALIB_LANDMARKS[i]
interface CalibPt       { rel: Pt2; px: Pt2; }

// 8 facial landmarks used as calibration control points.
// Ordered left→right, top→bottom for a natural click sequence.
const CALIB_LANDMARKS = [
  { idx: 33,  label: "Ojo izq — esquina exterior" },
  { idx: 133, label: "Ojo izq — esquina interior" },
  { idx: 362, label: "Ojo der — esquina interior" },
  { idx: 263, label: "Ojo der — esquina exterior" },
  { idx: 4,   label: "Punta de la nariz"          },
  { idx: 61,  label: "Comisura izq de la boca"    },
  { idx: 291, label: "Comisura der de la boca"    },
  { idx: 152, label: "Mentón"                     },
] as const;
const N_CALIB = CALIB_LANDMARKS.length; // 8

// Gaussian elimination with partial pivoting. Solves A·x = b in-place.
function gaussElim(A: number[][], b: number[]): number[] {
  const n = b.length;
  const aug = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let mx = c;
    for (let r = c+1; r < n; r++) if (Math.abs(aug[r][c]) > Math.abs(aug[mx][c])) mx = r;
    [aug[c], aug[mx]] = [aug[mx], aug[c]];
    const piv = aug[c][c];
    if (Math.abs(piv) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = aug[r][c] / piv;
      for (let j = c; j <= n; j++) aug[r][j] -= f * aug[c][j];
    }
  }
  return aug.map((row, i) => row[n] / row[i]);
}

// TPS radial basis function: φ(r) = r² log(r)
function tpsPhi(r: number): number {
  return r < 1e-10 ? 0 : r * r * Math.log(r);
}

// Builds a TPS interpolant from N face-space control points → avatar pixel coords.
// Returns a function evaluated per-landmark every frame (recomputed on each call).
function buildTPS(
  facePts:   Pt2[],   // current-frame normalized [0,1] face positions
  avatarPts: Pt2[],   // corresponding avatar pixel positions (stored at calibration)
): (fx: number, fy: number) => Pt2 {
  const n = facePts.length;
  const m = n + 3; // n TPS weights + 3 affine terms
  const K = Array.from({ length: m }, () => new Array<number>(m).fill(0));
  const bx = new Array<number>(m).fill(0);
  const by = new Array<number>(m).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const dx = facePts[i][0] - facePts[j][0];
      const dy = facePts[i][1] - facePts[j][1];
      K[i][j] = tpsPhi(Math.sqrt(dx*dx + dy*dy));
    }
    K[i][i]   += 1e-5;           // regularization
    K[i][n]    = K[n][i]   = 1;
    K[i][n+1]  = K[n+1][i] = facePts[i][0];
    K[i][n+2]  = K[n+2][i] = facePts[i][1];
    bx[i] = avatarPts[i][0];
    by[i] = avatarPts[i][1];
  }
  const wx = gaussElim(K.map(r=>[...r]), bx);
  const wy = gaussElim(K.map(r=>[...r]), by);
  return (fx, fy) => {
    let x = wx[n] + wx[n+1]*fx + wx[n+2]*fy;
    let y = wy[n] + wy[n+1]*fx + wy[n+2]*fy;
    for (let i = 0; i < n; i++) {
      const dx = fx - facePts[i][0], dy = fy - facePts[i][1];
      const phi = tpsPhi(Math.sqrt(dx*dx + dy*dy));
      x += wx[i] * phi;
      y += wy[i] * phi;
    }
    return [x, y];
  };
}

export default function ArLabCanvas() {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const glCanvasRef = useRef<HTMLCanvasElement>(null); // Three.js WebGL
  const exprCanvRef = useRef<HTMLCanvasElement>(null); // 2D expression overlay
  const streamRef   = useRef<MediaStream | null>(null);
  const lmkRef      = useRef<unknown>(null);
  const rafRef      = useRef(0);
  const lastVTRef   = useRef(-1);

  // Three.js objects
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef     = useRef<THREE.Scene | null>(null);
  const cameraRef    = useRef<THREE.OrthographicCamera | null>(null);
  const geomRef      = useRef<THREE.BufferGeometry | null>(null);
  const matRef       = useRef<THREE.MeshBasicMaterial | null>(null);
  const skirtGeomRef = useRef<THREE.BufferGeometry | null>(null);
  const skirtMatRef  = useRef<THREE.ShaderMaterial | null>(null);

  // Data
  const boundsRef   = useRef<AlienBounds | null>(null);
  const textureRef  = useRef<THREE.Texture | null>(null);
  const smoothLmsRef = useRef<Lm[] | null>(null);
  const exprRef     = useRef({ earL: 0.25, earR: 0.25, mar: 0 });
  const tpsCacheRef = useRef<{ fn: (fx: number, fy: number) => Pt2; src: string; flatPts: Float32Array } | null>(null);

  const exprOnRef      = useRef(true);
  const debugRef       = useRef(false);
  const calibratingRef = useRef(false); // pauses detectForVideo while lmk switches to IMAGE mode

  // Anchor calibration
  const activeSrcRef  = useRef<string>(PRESETS[0].src);
  const allAnchorsRef = useRef<Record<string, AvatarAnchors>>({});

  const [status,      setStatus]     = useState("Cargando MediaPipe...");
  const [activeSrc,   setActiveSrc]  = useState<string>(PRESETS[0].src);
  const [cameras,     setCameras]    = useState<MediaDeviceInfo[]>([]);
  const [selectedCam, setSelectedCam]= useState("");
  const [exprOn,      setExprOn]     = useState(true);
  const [debug,       setDebug]      = useState(false);
  const [debugVals,   setDebugVals]  = useState({ earL: 0, earR: 0, mar: 0 });
  const [allAnchors,  setAllAnchors] = useState<Record<string, AvatarAnchors>>({});
  const [calibSrc,     setCalibSrc]    = useState<string | null>(null);
  const [calibStage,   setCalibStage]  = useState(0);
  const [calibPts,     setCalibPts]    = useState<CalibPt[]>([]);
  const [autoCalibSrc, setAutoCalibSrc]= useState<string | null>(null);

  // ── Three.js setup ─────────────────────────────────────────────────────────
  const initThree = useCallback((W: number, H: number) => {
    const canvas = glCanvasRef.current;
    if (!canvas) return;

    // Clean up previous renderer
    rendererRef.current?.dispose();

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: false });
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // NDC orthographic camera: x in [-1,1], y in [-1,1]
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    cameraRef.current = camera;

    // Geometry: 468 vertices, dynamic position + uv, static index
    const geom = new THREE.BufferGeometry();
    geom.setIndex(new THREE.Uint16BufferAttribute(new Uint16Array(FACE_TRIS), 1));
    geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(468*3), 3));
    geom.setAttribute("uv",       new THREE.BufferAttribute(new Float32Array(468*2), 2));
    geomRef.current = geom;

    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: false,
    });
    matRef.current = mat;

    // Skirt geometry: 36 inner ring (oval landmarks) + 36 outer ring = 72 verts, 36 quads
    const skirtGeom = new THREE.BufferGeometry();
    const skirtIdx  = new Uint16Array(OVAL_N * 6);
    for (let i = 0; i < OVAL_N; i++) {
      const j = (i + 1) % OVAL_N;
      skirtIdx[i*6+0] = i;     skirtIdx[i*6+1] = j;          skirtIdx[i*6+2] = i + OVAL_N;
      skirtIdx[i*6+3] = j;     skirtIdx[i*6+4] = j + OVAL_N; skirtIdx[i*6+5] = i + OVAL_N;
    }
    skirtGeom.setIndex(new THREE.Uint16BufferAttribute(skirtIdx, 1));
    skirtGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(OVAL_N * 2 * 3), 3));
    skirtGeom.setAttribute("uv",       new THREE.BufferAttribute(new Float32Array(OVAL_N * 2 * 2), 2));
    // Per-vertex alpha: inner ring = 1 (opaque), outer ring = 0 (transparent) — static, no per-frame update
    const alphaArr = new Float32Array(OVAL_N * 2);
    for (let i = 0; i < OVAL_N; i++) { alphaArr[i] = 1.0; alphaArr[i + OVAL_N] = 0.0; }
    skirtGeom.setAttribute("alpha", new THREE.BufferAttribute(alphaArr, 1));
    skirtGeomRef.current = skirtGeom;

    // Shader material for skirt — supports per-vertex alpha via custom attribute
    const skirtMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: null } },
      vertexShader: `
        attribute float alpha;
        varying vec2 vUv;
        varying float vAlpha;
        void main() {
          vUv    = uv;
          vAlpha = alpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        varying vec2 vUv;
        varying float vAlpha;
        void main() {
          vec4 c = texture2D(map, vUv);
          gl_FragColor = vec4(c.rgb, c.a * vAlpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: false,
    });
    skirtMatRef.current = skirtMat;

    const skirtMesh = new THREE.Mesh(skirtGeom, skirtMat);
    skirtMesh.renderOrder = -1; // render before face mesh
    scene.add(skirtMesh);

    const mesh = new THREE.Mesh(geom, mat);
    mesh.renderOrder = 0;
    scene.add(mesh);
  }, []);

  const loadAvatar = useCallback((preset: Preset) => {
    setActiveSrc(preset.src);
    activeSrcRef.current = preset.src;
    boundsRef.current = null;
    smoothLmsRef.current = null;

    // Dispose old texture
    textureRef.current?.dispose();
    textureRef.current = null;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      boundsRef.current = detectContentBounds(img);
      const tex = new THREE.Texture(img);
      tex.needsUpdate = true;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      textureRef.current = tex;
      if (matRef.current) matRef.current.map = tex;
      if (skirtMatRef.current) { skirtMatRef.current.uniforms.map.value = tex; skirtMatRef.current.uniformsNeedUpdate = true; }
    };
    img.onerror = () => setStatus(`⚠ No se pudo cargar ${preset.src}`);
    img.src = preset.src;
  }, []);

  const startCamera = useCallback(async (deviceId?: string) => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(
        deviceId
          ? { video: { deviceId: { exact: deviceId }, width: 640, height: 480 } }
          : { video: { width: 640, height: 480 } }
      );
    } catch { stream = await navigator.mediaDevices.getUserMedia({ video: true }); }
    streamRef.current = stream;
    const vid = videoRef.current!;
    vid.srcObject = stream;
    await new Promise<void>(r => { vid.onloadedmetadata = () => r(); });
    vid.play();
  }, []);

  useEffect(() => { loadAvatar(PRESETS[0]); }, [loadAvatar]);

  const autoCalibrate = useCallback(async (preset: Preset) => {
    type LmkFull = {
      detectForVideo: (v: HTMLVideoElement, t: number) => { faceLandmarks?: Lm[][] };
      detect:         (input: HTMLCanvasElement) => { faceLandmarks?: Lm[][] };
      setOptions:     (opts: Record<string, unknown>) => Promise<void>;
    };
    const lmk = lmkRef.current as LmkFull | null;
    if (!lmk) { setStatus("⚠ MediaPipe no listo todavía"); return; }

    setAutoCalibSrc(preset.src);
    setStatus("Auto-calibrando...");

    try {
      // Load avatar image
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = preset.src;
      });

      // Draw on canvas with neutral background (MediaPipe needs non-transparent input)
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#888888";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Pause video detection, switch landmarker to IMAGE mode
      calibratingRef.current = true;
      await lmk.setOptions({ runningMode: "IMAGE" });
      const result = lmk.detect(canvas);
      await lmk.setOptions({ runningMode: "VIDEO" });
      calibratingRef.current = false;

      const lms = result?.faceLandmarks?.[0];
      if (!lms || lms.length < 468) {
        setStatus("⚠ Auto-calib: no se detectó cara en el avatar — calibrá manualmente");
        return;
      }

      const pts: Pt2[] = CALIB_LANDMARKS.map(({ idx }) => [
        lms[idx].x * img.naturalWidth,
        lms[idx].y * img.naturalHeight,
      ]);

      const anchors: AvatarAnchors = { pts };
      const updated = { ...allAnchorsRef.current, [preset.src]: anchors };
      setAllAnchors(updated);
      allAnchorsRef.current = updated;
      tpsCacheRef.current = null; // force TPS rebuild with new calibration
      try { localStorage.setItem("ar-lab-anchors", JSON.stringify(updated)); } catch {}

      loadAvatar(preset);
      setStatus("Auto-calibración ✓");
    } catch (e) {
      calibratingRef.current = false;
      setStatus(`⚠ Auto-calib falló: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAutoCalibSrc(null);
    }
  }, [loadAvatar]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ar-lab-anchors");
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, unknown>;
        // Drop entries from old format (had eyeL/eyeR/mouth instead of pts[])
        const valid = Object.fromEntries(
          Object.entries(parsed).filter(([, v]) =>
            v !== null && typeof v === "object" && Array.isArray((v as AvatarAnchors).pts)
          )
        ) as Record<string, AvatarAnchors>;
        setAllAnchors(valid);
        allAnchorsRef.current = valid;
      }
    } catch {}
  }, []);

  useEffect(() => { allAnchorsRef.current = allAnchors; }, [allAnchors]);

  useEffect(() => {
    let alive = true;
    let dbgTick = 0;

    async function init() {
      const benign = /TensorFlow Lite|XNNPACK|TfLite|^INFO:|^WARNING:/;
      const origErr = console.error.bind(console);
      console.error = (...a: unknown[]) => {
        if (typeof a[0]==="string" && benign.test(a[0])) return;
        origErr(...a);
      };

      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const fs = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const lmk = await FaceLandmarker.createFromOptions(fs, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO", numFaces: 1, outputFaceBlendshapes: false,
      });
      if (!alive) return;
      lmkRef.current = lmk;
      console.error = origErr;

      setStatus("Iniciando cámara...");
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
      tmp.getTracks().forEach(t => t.stop());
      const devs = await navigator.mediaDevices.enumerateDevices();
      const vdevs = devs.filter(d => d.kind==="videoinput");
      setCameras(vdevs);
      const first = vdevs[0]?.deviceId ?? "";
      setSelectedCam(first);
      await startCamera(first);
      if (!alive) return;
      setStatus("Tracking activo ✓");

      function loop() {
        if (!alive) return;
        const vid = videoRef.current;
        const detect = lmkRef.current as {
          detectForVideo: (v: HTMLVideoElement, t: number) => { faceLandmarks?: Lm[][] }
        } | null;

        if (!vid || !detect) { rafRef.current=requestAnimationFrame(loop); return; }

        const W = vid.videoWidth, H = vid.videoHeight;
        if (!W || !H) { rafRef.current=requestAnimationFrame(loop); return; }

        // Init Three.js once we know video dimensions
        if (!rendererRef.current) initThree(W, H);

        if (vid.currentTime !== lastVTRef.current && !calibratingRef.current) {
          lastVTRef.current = vid.currentTime;
          const result = detect.detectForVideo(vid, performance.now());
          const lms = result?.faceLandmarks?.[0];

          if (lms) {
            // Smooth landmarks
            const prev = smoothLmsRef.current;
            if (!prev || prev.length !== lms.length) {
              smoothLmsRef.current = lms.map(l => ({...l}));
            } else {
              for (let i=0; i<lms.length; i++) {
                prev[i].x = SMOOTH*lms[i].x + (1-SMOOTH)*prev[i].x;
                prev[i].y = SMOOTH*lms[i].y + (1-SMOOTH)*prev[i].y;
              }
            }

            // Expression smoothing
            const ex = exprRef.current;
            ex.earL = EXPR_A*earVal(lms,W,H,LM_IDX.EYE_L_UP,LM_IDX.EYE_L_DN,LM_IDX.EYE_L_OUT,LM_IDX.EYE_L_IN)+(1-EXPR_A)*ex.earL;
            ex.earR = EXPR_A*earVal(lms,W,H,LM_IDX.EYE_R_UP,LM_IDX.EYE_R_DN,LM_IDX.EYE_R_OUT,LM_IDX.EYE_R_IN)+(1-EXPR_A)*ex.earR;
            ex.mar  = EXPR_A*marVal(lms,W,H)+(1-EXPR_A)*ex.mar;

            if (debugRef.current && ++dbgTick%10===0) {
              setDebugVals({earL:+ex.earL.toFixed(3),earR:+ex.earR.toFixed(3),mar:+ex.mar.toFixed(3)});
            }
          }
        }

        // ── Three.js render ───────────────────────────────────────────────
        const renderer = rendererRef.current;
        const scene    = sceneRef.current;
        const camera   = cameraRef.current;
        const geom     = geomRef.current;
        const bounds   = boundsRef.current;
        const smoothLms = smoothLmsRef.current;

        if (!renderer || !scene || !camera || !geom || !bounds || !smoothLms || !textureRef.current) {
          rafRef.current=requestAnimationFrame(loop); return;
        }

        // Resize renderer if video size changed
        const size = renderer.getSize(new THREE.Vector2());
        if (size.x !== W || size.y !== H) {
          renderer.setSize(W, H, false);
        }

        const { cx, cy, contentH, contentW, iW, iH } = bounds;

        // ── Face bbox (always needed for skirt + fallback) ──
        let fMinX = 1, fMaxX = 0, fMinY = 1, fMaxY = 0;
        for (const lm of smoothLms) {
          if (lm.x < fMinX) fMinX = lm.x;
          if (lm.x > fMaxX) fMaxX = lm.x;
          if (lm.y < fMinY) fMinY = lm.y;
          if (lm.y > fMaxY) fMaxY = lm.y;
        }
        const faceCenterX = (fMinX + fMaxX) / 2;
        const faceCenterY = (fMinY + fMaxY) / 2;
        const faceW = Math.max(fMaxX - fMinX, 0.001);
        const faceH = Math.max(fMaxY - fMinY, 0.001);

        // ── UV function: TPS when calibrated, bbox fallback otherwise ──
        const avatarAnchors = allAnchorsRef.current[activeSrcRef.current];
        let uvFn: (fx: number, fy: number) => Pt2;
        if (avatarAnchors && Array.isArray(avatarAnchors.pts) && avatarAnchors.pts.length === N_CALIB) {
          const facePts = CALIB_LANDMARKS.map(({ idx }) => [smoothLms[idx].x, smoothLms[idx].y] as Pt2);
          const cache = tpsCacheRef.current;
          let rebuild = !cache || cache.src !== activeSrcRef.current;
          if (!rebuild && cache) {
            for (let i = 0; i < N_CALIB; i++) {
              const dx = facePts[i][0] - cache.flatPts[i * 2];
              const dy = facePts[i][1] - cache.flatPts[i * 2 + 1];
              if (dx * dx + dy * dy > 1e-4) { rebuild = true; break; }
            }
          }
          if (rebuild) {
            const flatPts = new Float32Array(N_CALIB * 2);
            for (let i = 0; i < N_CALIB; i++) { flatPts[i * 2] = facePts[i][0]; flatPts[i * 2 + 1] = facePts[i][1]; }
            tpsCacheRef.current = { fn: buildTPS(facePts, avatarAnchors.pts), src: activeSrcRef.current, flatPts };
          }
          uvFn = tpsCacheRef.current!.fn;
        } else {
          // Fallback: simple bbox mapping (no calibration)
          uvFn = (fx, fy) => [
            cx + ((fx - faceCenterX) / faceW) * contentW,
            cy + ((fy - faceCenterY) / faceH) * contentH,
          ];
        }

        // ── Update face mesh ──
        const posArr = (geom.attributes.position as THREE.BufferAttribute).array as Float32Array;
        const uvArr  = (geom.attributes.uv as THREE.BufferAttribute).array as Float32Array;
        for (let i = 0; i < 468; i++) {
          const lm = smoothLms[i];
          posArr[i*3+0] = lm.x * 2 - 1;
          posArr[i*3+1] = 1 - lm.y * 2;
          posArr[i*3+2] = 0;
          const [ax, ay] = uvFn(lm.x, lm.y);
          uvArr[i*2+0] = ax / iW;
          uvArr[i*2+1] = 1 - ay / iH;
        }

        // ── Update skirt mesh (face oval extended outward from center) ──
        const skirtGeom = skirtGeomRef.current;
        if (skirtGeom) {
          const sp = (skirtGeom.attributes.position as THREE.BufferAttribute).array as Float32Array;
          const su = (skirtGeom.attributes.uv as THREE.BufferAttribute).array as Float32Array;
          for (let i = 0; i < OVAL_N; i++) {
            const lm  = smoothLms[FACE_OVAL[i]];
            // Inner ring — same as face mesh vertex
            sp[i*3+0] = lm.x * 2 - 1;  sp[i*3+1] = 1 - lm.y * 2;  sp[i*3+2] = 0;
            const [ax_in, ay_in] = uvFn(lm.x, lm.y);
            su[i*2+0] = ax_in / iW;  su[i*2+1] = 1 - ay_in / iH;
            // Outer ring — geometry extends beyond face oval; UV pushed outward from
            // avatar content center so outer ring samples avatar's extended areas (hair, chin).
            // Vertex alpha fades 1→0 across the skirt so the edge blends transparently.
            const ox = faceCenterX + (lm.x - faceCenterX) * SKIRT_OUT;
            const oy = faceCenterY + (lm.y - faceCenterY) * SKIRT_OUT;
            const io = i + OVAL_N;
            sp[io*3+0] = ox * 2 - 1;  sp[io*3+1] = 1 - oy * 2;  sp[io*3+2] = 0;
            const ax_out = ax_in + (ax_in - cx) * SKIRT_UV_EXT;
            const ay_out = ay_in + (ay_in - cy) * SKIRT_UV_EXT;
            su[io*2+0] = ax_out / iW;  su[io*2+1] = 1 - ay_out / iH;
          }
          (skirtGeom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
          (skirtGeom.attributes.uv as THREE.BufferAttribute).needsUpdate = true;
        }

        (geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        (geom.attributes.uv as THREE.BufferAttribute).needsUpdate = true;

        renderer.render(scene, camera);

        // ── 2D expression overlay ─────────────────────────────────────────
        const exprCanvas = exprCanvRef.current;
        const exprCtx    = exprCanvas?.getContext("2d");
        if (exprCanvas && exprCtx && exprOnRef.current && smoothLms) {
          if (exprCanvas.width!==W)  exprCanvas.width=W;
          if (exprCanvas.height!==H) exprCanvas.height=H;
          exprCtx.clearRect(0, 0, W, H);

          const ex = exprRef.current;
          const blinkL = Math.max(0,Math.min(1,(BLINK_OPEN-ex.earL)/(BLINK_OPEN-BLINK_CLOSE)));
          const blinkR = Math.max(0,Math.min(1,(BLINK_OPEN-ex.earR)/(BLINK_OPEN-BLINK_CLOSE)));
          const roll   = Math.atan2(
            (smoothLms[LM_IDX.EYE_R_OUT].y-smoothLms[LM_IDX.EYE_L_OUT].y)*H,
            (smoothLms[LM_IDX.EYE_R_OUT].x-smoothLms[LM_IDX.EYE_L_OUT].x)*W
          );

          const eyeLx = ((smoothLms[33].x+smoothLms[133].x)/2)*W;
          const eyeLy = ((smoothLms[33].y+smoothLms[133].y)/2)*H;
          const eyeRx = ((smoothLms[263].x+smoothLms[362].x)/2)*W;
          const eyeRy = ((smoothLms[263].y+smoothLms[362].y)/2)*H;
          const eyeRad = dist2(smoothLms[LM_IDX.EYE_L_UP],smoothLms[LM_IDX.EYE_L_DN],W,H)*3;

          if (blinkL>0.05||blinkR>0.05) {
            exprCtx.save();
            exprCtx.globalCompositeOperation = "destination-out";
            if (blinkL>0.05) {
              exprCtx.globalAlpha = blinkL;
              exprCtx.beginPath();
              exprCtx.ellipse(eyeLx,eyeLy,eyeRad,eyeRad*0.5*blinkL,roll,0,Math.PI*2);
              exprCtx.fill();
            }
            if (blinkR>0.05) {
              exprCtx.globalAlpha = blinkR;
              exprCtx.beginPath();
              exprCtx.ellipse(eyeRx,eyeRy,eyeRad,eyeRad*0.5*blinkR,roll,0,Math.PI*2);
              exprCtx.fill();
            }
            exprCtx.restore();
          }

          // Mouth open
          const MAR_MIN=0.05, MAR_MAX=0.45;
          const mNorm = Math.max(0,Math.min(1,(ex.mar-MAR_MIN)/(MAR_MAX-MAR_MIN)));
          if (mNorm>0.05) {
            const mCx = ((smoothLms[61].x+smoothLms[291].x)/2)*W;
            const mCy = ((smoothLms[61].y+smoothLms[291].y)/2)*H;
            const mW  = dist2(smoothLms[61],smoothLms[291],W,H)*0.48;
            const mH  = mW*0.2 + mNorm*mW*1.1;
            exprCtx.save();
            exprCtx.globalCompositeOperation = "destination-out";
            exprCtx.globalAlpha = Math.min(1,mNorm*1.4);
            exprCtx.beginPath();
            exprCtx.ellipse(mCx,mCy,mW,mH,roll,0,Math.PI*2);
            exprCtx.fill();
            exprCtx.restore();
          }
        }

        rafRef.current = requestAnimationFrame(loop);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    init().catch(e => setStatus(`⚠ ${e instanceof Error?e.message:String(e)}`));
    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      rendererRef.current?.dispose();
      rendererRef.current = null;
      skirtGeomRef.current?.dispose();
      skirtGeomRef.current = null;
      skirtMatRef.current?.dispose();
      skirtMatRef.current = null;
      textureRef.current?.dispose();
    };
  }, [startCamera, initThree]);

  function handleCalibClick(e: React.MouseEvent<HTMLDivElement>) {
    const img = e.currentTarget.querySelector("img") as HTMLImageElement | null;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left)  / rect.width));
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top)   / rect.height));
    const pt: CalibPt = { rel: [relX, relY], px: [relX * img.naturalWidth, relY * img.naturalHeight] };
    const newPts = [...calibPts, pt];
    if (newPts.length === N_CALIB) {
      const anchors: AvatarAnchors = { pts: newPts.map(p => p.px) };
      const updated = { ...allAnchors, [calibSrc!]: anchors };
      setAllAnchors(updated);
      allAnchorsRef.current = updated;
      try { localStorage.setItem("ar-lab-anchors", JSON.stringify(updated)); } catch {}
      setCalibSrc(null); setCalibPts([]); setCalibStage(0);
    } else {
      setCalibPts(newPts);
      setCalibStage(newPts.length);
    }
  }

  function undoLastCalibPt() {
    if (calibPts.length === 0) return;
    const newPts = calibPts.slice(0, -1);
    setCalibPts(newPts);
    setCalibStage(newPts.length);
  }

  function saveFrame() {
    const vid=videoRef.current, gl=glCanvasRef.current, ex=exprCanvRef.current;
    if (!vid||!gl) return;
    const out=document.createElement("canvas");
    out.width=vid.videoWidth; out.height=vid.videoHeight;
    const ctx=out.getContext("2d")!;
    ctx.save(); ctx.scale(-1,1); ctx.translate(-out.width,0); ctx.drawImage(vid,0,0); ctx.restore();
    ctx.drawImage(gl,0,0);
    if (ex) ctx.drawImage(ex,0,0);
    out.toBlob(blob=>{
      if (!blob) return;
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a"); a.href=url;
      a.download=`marciano-ar-${Date.now()}.png`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${status.includes("✓")?"bg-[#8cff59]":status.includes("⚠")?"bg-red-400":"animate-pulse bg-amber-400"}`} />
        <span className="text-sm text-zinc-400">{status}</span>
      </div>

      {cameras.length>1 && (
        <div className="panel-soft rounded-[22px] p-4 flex flex-col gap-2">
          <p className="eyebrow text-xs">Cámara</p>
          <select value={selectedCam} onChange={async e=>{
            const id=e.target.value; setSelectedCam(id);
            smoothLmsRef.current=null;
            setStatus("Cambiando..."); await startCamera(id); setStatus("Tracking activo ✓");
          }} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-[#8cff59]/60 focus:outline-none">
            {cameras.map(c=><option key={c.deviceId} value={c.deviceId}>{c.label||c.deviceId.slice(0,8)}</option>)}
          </select>
        </div>
      )}

      <div className="panel-card rounded-[22px] p-4 flex flex-col gap-3">
        <p className="eyebrow text-xs">Avatar</p>
        <div className="flex flex-wrap items-start gap-3">
          {PRESETS.map(a=>(
            <div key={a.src} className="flex flex-col items-center gap-1.5">
              <button onClick={()=>loadAvatar(a)}
                className={`ghost-button rounded-[22px] p-2 flex flex-col items-center gap-2 transition-colors ${activeSrc===a.src?"border-[#8cff59]":""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.src} alt={a.label} className="h-20 w-20 rounded-[16px] object-cover" />
                <span className={`text-xs font-medium ${activeSrc===a.src?"text-[#8cff59]":"text-zinc-400"}`}>{a.label}</span>
              </button>
              <div className="flex gap-1.5">
                <button
                  onClick={()=>{ loadAvatar(a); setCalibSrc(a.src); setCalibStage(0); setCalibPts([]); }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${allAnchors[a.src]?"border-[#8cff59]/60 text-[#8cff59]":"border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"}`}>
                  {allAnchors[a.src] ? "✓" : "manual"}
                </button>
                <button
                  disabled={autoCalibSrc === a.src}
                  onClick={()=>{ loadAvatar(a); autoCalibrate(a); }}
                  className="text-xs px-2.5 py-1 rounded-full border border-[#8cff59]/40 text-[#8cff59] hover:border-[#8cff59] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {autoCalibSrc === a.src ? "..." : "Auto ✦"}
                </button>
              </div>
            </div>
          ))}
          <label className="ghost-button rounded-[22px] p-2 flex flex-col items-center justify-center gap-2 h-[6.5rem] w-20 cursor-pointer text-zinc-500 hover:text-zinc-300">
            <span className="text-2xl">+</span><span className="text-xs">Subir</span>
            <input type="file" accept="image/*" className="hidden" onChange={e=>{
              const f=e.target.files?.[0]; if (!f) return;
              loadAvatar({label:"Custom",src:URL.createObjectURL(f)});
            }} />
          </label>
        </div>
      </div>

      <div className="panel-soft rounded-[22px] p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3">
          <p className="eyebrow text-xs">Expresiones</p>
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-300">Expresiones activas</p>
            <button onClick={()=>{ exprOnRef.current=!exprOn; setExprOn(!exprOn); }}
              className={`relative h-6 w-11 rounded-full transition-colors ${exprOn?"bg-[#8cff59]":"bg-zinc-700"}`}>
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${exprOn?"left-6":"left-1"}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-300">Debug EAR / MAR</p>
            <button onClick={()=>{ debugRef.current=!debug; setDebug(!debug); }}
              className={`relative h-6 w-11 rounded-full transition-colors ${debug?"bg-[#8cff59]":"bg-zinc-700"}`}>
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${debug?"left-6":"left-1"}`} />
            </button>
          </div>
          {debug && (
            <div className="rounded-xl bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-400 flex gap-4">
              <span>EAR-L: <span className="text-amber-300">{debugVals.earL}</span></span>
              <span>EAR-R: <span className="text-amber-300">{debugVals.earR}</span></span>
              <span>MAR: <span className="text-[#8cff59]">{debugVals.mar}</span></span>
            </div>
          )}
        </div>
      </div>

      {/* Video + WebGL overlay + 2D expression overlay, all stacked */}
      <div className="relative overflow-hidden rounded-[22px] bg-zinc-950" style={{aspectRatio:"4/3"}}>
        <video ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={{transform:"scaleX(-1)"}} playsInline muted />
        {/* Three.js WebGL — face mesh warp */}
        <canvas ref={glCanvasRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={{transform:"scaleX(-1)"}} />
        {/* 2D canvas — blink / mouth destination-out */}
        <canvas ref={exprCanvRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={{transform:"scaleX(-1)"}} />
      </div>

      <button onClick={saveFrame} className="neon-button rounded-[20px] px-5 py-3 font-semibold">
        Guardar frame
      </button>

      <p className="text-xs text-zinc-500 text-center">
        {allAnchors[activeSrc] ? `TPS · ${N_CALIB} puntos calibrados` : "Sin calibrar · calibrá el avatar para TPS"}
        {" · 852 tris"}
      </p>

      {/* ── Calibración modal ──────────────────────────────────────────────── */}
      {calibSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 overflow-y-auto">
          <div className="panel-card rounded-[28px] p-5 flex flex-col gap-4 w-full max-w-sm my-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base text-white">Calibrar avatar</h3>
              <span className="eyebrow text-xs text-zinc-500">{calibStage + 1} / {N_CALIB}</span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 w-full rounded-full bg-zinc-800">
              <div className="h-1.5 rounded-full bg-[#8cff59] transition-all"
                style={{ width: `${(calibStage / N_CALIB) * 100}%` }} />
            </div>

            {/* Current instruction */}
            <div className="rounded-[16px] border border-[#8cff59]/30 bg-[#8cff59]/8 px-4 py-3">
              <p className="text-xs text-zinc-400 mb-0.5">Marcá en el avatar:</p>
              <p className="text-sm font-semibold text-[#8cff59]">
                {CALIB_LANDMARKS[calibStage]?.label}
              </p>
            </div>

            {/* Avatar image + click target */}
            <div
              className="relative cursor-crosshair select-none rounded-[22px] overflow-hidden bg-zinc-900"
              onClick={handleCalibClick}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={calibSrc} alt="avatar" className="w-full" draggable={false} />
              {/* Already-placed dots */}
              {calibPts.map((pt, i) => (
                <div key={i}
                  className="pointer-events-none absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#8cff59] text-[9px] font-bold text-black"
                  style={{ left: `${pt.rel[0]*100}%`, top: `${pt.rel[1]*100}%` }}>
                  {i + 1}
                </div>
              ))}
            </div>

            {/* All points list */}
            <div className="flex flex-col gap-1">
              {CALIB_LANDMARKS.map((lm, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs px-2 py-1 rounded-lg transition-colors ${
                  i < calibStage ? "text-[#8cff59]" :
                  i === calibStage ? "bg-[#8cff59]/10 text-white" :
                  "text-zinc-600"
                }`}>
                  <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                    i < calibStage ? "bg-[#8cff59] text-black" :
                    i === calibStage ? "border border-[#8cff59] text-[#8cff59]" :
                    "border border-zinc-700 text-zinc-600"
                  }`}>{i + 1}</span>
                  {lm.label}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {calibPts.length > 0 && (
                <button onClick={undoLastCalibPt}
                  className="ghost-button flex-1 rounded-[20px] px-3 py-2 text-sm text-center">
                  ← Deshacer
                </button>
              )}
              <button onClick={()=>{ setCalibSrc(null); setCalibPts([]); setCalibStage(0); }}
                className="ghost-button flex-1 rounded-[20px] px-3 py-2 text-sm text-center">
                Cancelar
              </button>
            </div>

            {allAnchors[calibSrc] && calibPts.length === 0 && (
              <button onClick={()=>{
                const updated = Object.fromEntries(Object.entries(allAnchors).filter(([k])=>k!==calibSrc));
                setAllAnchors(updated); allAnchorsRef.current = updated;
                try { localStorage.setItem("ar-lab-anchors", JSON.stringify(updated)); } catch {}
                setCalibSrc(null);
              }} className="text-xs text-red-400 hover:text-red-300 text-center">
                Borrar calibración existente y recalibrar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
