"use client";

import type { FaceMetrics } from "@/lib/marciano-style";

// MediaPipe landmark indices (478-point model)
// These are approximate well-known indices for key facial features
const LM = {
  // Top of head
  TOP: 10,
  // Bottom of chin
  CHIN: 152,
  // Left/right cheekbones (widest face point)
  LEFT_CHEEK: 234,
  RIGHT_CHEEK: 454,
  // Left/right jaw corners
  LEFT_JAW: 172,
  RIGHT_JAW: 397,
  // Left/right forehead corners (approx)
  LEFT_FOREHEAD: 21,
  RIGHT_FOREHEAD: 251,
  // Left/right chin corners
  LEFT_CHIN: 58,
  RIGHT_CHIN: 288,
} as const;

type Landmark = { x: number; y: number; z: number };

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
