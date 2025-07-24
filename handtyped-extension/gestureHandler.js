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
