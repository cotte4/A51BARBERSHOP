"use client";

import type { FaceMetrics } from "@/lib/marciano-style";

// MediaPipe FaceMesh landmark indices (478-point model, first 468 are face mesh)
// Validated against MediaPipe canonical face model topology
const LM = {
  // Vertical axis
  TOP: 10,          // forehead center
  CHIN: 152,        // chin bottom
  // Cheekbones — widest face points (zygion area)
  LEFT_CHEEK: 234,
  RIGHT_CHEEK: 454,
  // Jaw corners (gonion area)
  LEFT_JAW: 172,
  RIGHT_JAW: 397,
  // Forehead width (lateral forehead, above eyebrow tails)
  LEFT_FOREHEAD: 21,
  RIGHT_FOREHEAD: 251,
  // Chin width (chin corners)
  LEFT_CHIN: 58,
  RIGHT_CHIN: 288,
  // Alignment check — outer eye corners (canonical in FaceMesh)
  LEFT_EYE_OUTER: 33,
  RIGHT_EYE_OUTER: 263,
  // Nose tip (for left/right centering)
  NOSE_TIP: 4,
} as const;

type Landmark = { x: number; y: number; z: number };

// 2D Euclidean distance (x, y only — ratios are scale-invariant so z not needed here)
function dist(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function computeFaceMetrics(landmarks: Landmark[]): FaceMetrics {
  const faceHeight = dist(landmarks[LM.TOP], landmarks[LM.CHIN]);
  const faceWidth = dist(landmarks[LM.LEFT_CHEEK], landmarks[LM.RIGHT_CHEEK]);
  const jawWidth = dist(landmarks[LM.LEFT_JAW], landmarks[LM.RIGHT_JAW]);
  const foreheadWidth = dist(landmarks[LM.LEFT_FOREHEAD], landmarks[LM.RIGHT_FOREHEAD]);
  const chinWidth = dist(landmarks[LM.LEFT_CHIN], landmarks[LM.RIGHT_CHIN]);

  return {
    widthHeightRatio: faceHeight > 0 ? faceWidth / faceHeight : 1,
    jawWidthRatio: faceWidth > 0 ? jawWidth / faceWidth : 1,
    foreheadChinRatio: chinWidth > 0 ? foreheadWidth / chinWidth : 1,
  };
}

// Average multiple metric samples to reduce single-frame noise
export function averageMetrics(samples: FaceMetrics[]): FaceMetrics {
  const n = samples.length;
  if (n === 0) return { widthHeightRatio: 1, jawWidthRatio: 1, foreheadChinRatio: 1 };
  return {
    widthHeightRatio: samples.reduce((s, m) => s + m.widthHeightRatio, 0) / n,
    jawWidthRatio: samples.reduce((s, m) => s + m.jawWidthRatio, 0) / n,
    foreheadChinRatio: samples.reduce((s, m) => s + m.foreheadChinRatio, 0) / n,
  };
}

export type AlignmentStatus = "ok" | "no_face" | "tilt" | "offcenter";

// Check if face is well-positioned for accurate metric capture.
// Uses eye symmetry (head tilt) and nose centering (left-right rotation).
export function checkFaceAlignment(landmarks: Landmark[]): AlignmentStatus {
  const leftEye = landmarks[LM.LEFT_EYE_OUTER];
  const rightEye = landmarks[LM.RIGHT_EYE_OUTER];
  const nose = landmarks[LM.NOSE_TIP];

  if (!leftEye || !rightEye || !nose) return "no_face";

  const eyeSpan = Math.abs(rightEye.x - leftEye.x);
  if (eyeSpan < 0.05) return "no_face"; // too small / not detected properly

  // Tilt: eyes should be at roughly the same Y (vertical position)
  const eyeYDiff = Math.abs(leftEye.y - rightEye.y);
  if (eyeYDiff / eyeSpan > 0.13) return "tilt"; // >13% → visible tilt

  // Rotation: nose tip should be horizontally centered between eyes
  const eyeCenterX = (leftEye.x + rightEye.x) / 2;
  const noseOffset = Math.abs(nose.x - eyeCenterX);
  if (noseOffset / eyeSpan > 0.13) return "offcenter"; // >13% → turned away

  return "ok";
}

let landmarkerInstance: unknown | null = null;

export async function loadFaceLandmarker() {
  if (landmarkerInstance) return landmarkerInstance;

  const vision = await import("@mediapipe/tasks-vision");
  const { FaceLandmarker, FilesetResolver } = vision;

  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU",
    },
    outputFaceBlendshapes: false,
    runningMode: "VIDEO",
    numFaces: 1,
  });

  landmarkerInstance = landmarker;
  return landmarker;
}

export async function detectLandmarksFromVideo(
  video: HTMLVideoElement,
   
  landmarker: any
): Promise<Landmark[] | null> {
  try {
    const result = landmarker.detectForVideo(video, performance.now());
    const landmarks = result?.faceLandmarks?.[0];
    if (!landmarks || landmarks.length < 468) return null;
    return landmarks as Landmark[];
  } catch {
    return null;
  }
}
