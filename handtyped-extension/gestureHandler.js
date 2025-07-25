let hands, camera;

export async function startHandTracking(videoElement, onLandmarksDetected) {
  const { Hands } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");
  const { Camera } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");

  hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
  });

  hands.onResults(results => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      onLandmarksDetected(landmarks);
    }
  });

  camera = new Camera(videoElement, {
    onFrame: async () => {
      await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480,
  });

  camera.start();
}

export function stopHandTracking() {
  if (camera) camera.stop();
}

// Normalize landmarks to be translation and scale invariant
export function normalizeLandmarks(landmarks) {
  // Center to wrist (landmark 0)
  const wrist = landmarks[0];
  const centered = landmarks.map(pt => ({
    x: pt.x - wrist.x,
    y: pt.y - wrist.y,
    z: pt.z - wrist.z
  }));
  // Compute scale (max distance from wrist)
  const scale = Math.max(...centered.map(pt => Math.sqrt(pt.x*pt.x + pt.y*pt.y + pt.z*pt.z)));
  if (scale === 0) return centered;
  // Scale to unit size
  return centered.map(pt => ({ x: pt.x/scale, y: pt.y/scale, z: pt.z/scale }));
}

// Compute Euclidean distance between two sets of normalized landmarks
export function landmarkDistance(a, b) {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const dx = a[i].x - b[i].x;
    const dy = a[i].y - b[i].y;
    const dz = a[i].z - b[i].z;
    sum += dx*dx + dy*dy + dz*dz;
  }
  return Math.sqrt(sum / a.length);
}

// Match current landmarks to stored gesture bindings
export function matchGesture(currentLandmarks, bindings, threshold = 0.2) {
  const normCurrent = normalizeLandmarks(currentLandmarks);
  let bestMatch = null;
  let bestDist = Infinity;
  for (const binding of bindings) {
    if (!binding.landmarks) continue;
    const normStored = normalizeLandmarks(binding.landmarks);
    const dist = landmarkDistance(normCurrent, normStored);
    if (dist < threshold && dist < bestDist) {
      bestDist = dist;
      bestMatch = binding;
    }
  }
  return bestMatch;
}
