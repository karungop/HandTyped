// TypeScript version of contentScript.js
// Add type annotations and interfaces for clarity and type safety

// Remove the reference types line for 'chrome' and declare chrome as any
// @ts-ignore
const chrome: any = window.chrome;

// Declare MediaPipe globals
// These are attached to window by the UMD bundles
export {};
declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

interface GestureBinding {
  name: string;
  landmarks: Array<{ x: number; y: number; z: number }>;
  boundKey: string;
}

let stream: MediaStream | null = null;
let video: HTMLVideoElement | null = null;
let tracking = false;
let hands: any = null;
let camera: any = null;
let lastDetected: any = null;
let lastFeedbackTimeout: number | null = null;
let pendingAddGesture = false;
let pendingLandmarks: any = null;

// --- Begin inlined gestureHandler.js functions ---
function normalizeLandmarks(landmarks: Array<{ x: number; y: number; z: number }>) {
  const wrist = landmarks[0];
  const centered = landmarks.map(pt => ({
    x: pt.x - wrist.x,
    y: pt.y - wrist.y,
    z: pt.z - wrist.z
  }));
  const scale = Math.max(...centered.map(pt => Math.sqrt(pt.x*pt.x + pt.y*pt.y + pt.z*pt.z)));
  if (scale === 0) return centered;
  return centered.map(pt => ({ x: pt.x/scale, y: pt.y/scale, z: pt.z/scale }));
}

function landmarkDistance(a: Array<{ x: number; y: number; z: number }>, b: Array<{ x: number; y: number; z: number }>) {
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

function matchGesture(currentLandmarks: Array<{ x: number; y: number; z: number }>, bindings: GestureBinding[], threshold = 0.2): GestureBinding | null {
  const normCurrent = normalizeLandmarks(currentLandmarks);
  let bestMatch: GestureBinding | null = null;
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
// --- End inlined gestureHandler.js functions ---

// --- Begin inlined gestureBindings.js functions ---
function addGesture(name: string, landmarks: any, key: string) {
  getAllBindings().then(bindings => {
    const gesture: GestureBinding = { name, landmarks, boundKey: key };
    bindings.push(gesture);
    chrome.storage.local.set({ gestures: bindings });
  });
}

function getAllBindings(): Promise<GestureBinding[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get("gestures", (data) => {
      resolve(data.gestures || []);
    });
  });
}
// --- End inlined gestureBindings.js functions ---

chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  console.log("Content Script: message received", message);
  if (message.action === 'startDetection') {
    startDetection();
  } else if (message.action === 'stopDetection') {
    stopDetection();
  } else if (message.action === 'addGesture') {
    pendingAddGesture = true;
    showFeedback('Show your gesture to the camera...');
  }
});

async function startDetection() {
  if (tracking) return;

  stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video = document.createElement('video');
  video.srcObject = stream;
  video.autoplay = true;
  video.style.position = 'fixed';
  video.style.bottom = '10px';
  video.style.right = '10px';
  video.style.zIndex = '10000';
  video.style.width = '160px';
  document.body.appendChild(video);

  tracking = true;

  try {
    await loadMediaPipeAndStart(video);
  } catch (err) {
    console.error("Failed to start MediaPipe:", err);
    // stopDetection();
  }
}

function stopDetection() {
  console.log("stopDetection() called");

  if (!tracking) {
    console.log("Already not tracking.");
    return;
  }

  if (camera && typeof camera.stop === 'function') {
    camera.stop();
    console.log("Camera stopped");
    camera = null;
  } else {
    console.warn("Camera object missing or doesn't have .stop()");
  }

  if (hands && typeof hands.close === 'function') {
    hands.close();
    console.log("Hands instance closed");
    hands = null;
  } else {
    console.warn("Hands object missing or doesn't have .close()");
  }

  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop();
      console.log("Stopped track:", track);
    });
    stream = null;
  }

  if (video && video.parentNode) {
    video.parentNode.removeChild(video);
    console.log("Video element removed");
    video = null;
  }

  tracking = false;
  console.log("Detection fully stopped");
}

async function loadMediaPipeAndStart(videoEl: HTMLVideoElement) {
  // Helper to load a script if not already loaded
  function loadScriptOnce(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if ([...document.scripts].some(s => s.src.includes(src))) return resolve();
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(src);
      script.onload = () => resolve(); // Fix: event handler signature
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }
  // Load all required scripts in order
  await loadScriptOnce('lib/mediapipe/hands_solution_packed_assets_loader.js');
  await loadScriptOnce('lib/mediapipe/hands_solution_simd_wasm_bin.js');
  await loadScriptOnce('lib/mediapipe/hands.js');
  await loadScriptOnce('lib/mediapipe/camera_utils.js');

  hands = new window.Hands({
    locateFile: (file: string) => chrome.runtime.getURL(`lib/mediapipe/${file}`)
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
  });

  hands.onResults(async (results: any) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      lastDetected = landmarks;
      // If user requested to add a gesture, capture now
      if (pendingAddGesture) {
        pendingLandmarks = landmarks;
        promptForKeyAndSave();
        pendingAddGesture = false;
      }
      // Gesture matching
      const bindings = await getAllBindings();
      const match = matchGesture(landmarks, bindings, 0.2); // threshold can be tuned
      if (match) {
        simulateKeypress(match.boundKey);
        showFeedback(`Detected: ${match.name} → ${match.boundKey}`);
      }
    }
  });

  camera = new window.Camera(videoEl, {
    onFrame: async () => {
      if (hands) {
        await hands.send({ image: videoEl });
      }
    },
    width: 640,
    height: 480,
  });

  camera.start();
}

function simulateKeypress(key: string) {
  const event = new KeyboardEvent('keydown', { key: key, bubbles: true });
  document.dispatchEvent(event);
}

function showFeedback(msg: string) {
  let overlay = document.getElementById('handtyped-feedback');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'handtyped-feedback';
    overlay.style.position = 'fixed';
    overlay.style.bottom = '180px';
    overlay.style.right = '10px';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.style.color = 'white';
    overlay.style.padding = '8px 16px';
    overlay.style.borderRadius = '8px';
    overlay.style.zIndex = '10001';
    overlay.style.fontSize = '16px';
    document.body.appendChild(overlay);
  }
  overlay.textContent = msg;
  if (lastFeedbackTimeout) clearTimeout(lastFeedbackTimeout);
  lastFeedbackTimeout = window.setTimeout(() => {
    overlay && overlay.remove();
  }, 1500);
}

function promptForKeyAndSave() {
  const key = prompt('Press the key to bind to this gesture:');
  if (key && pendingLandmarks) {
    const name = prompt('Name this gesture:', 'CustomGesture');
    addGesture(name || 'CustomGesture', pendingLandmarks, key);
    showFeedback(`Gesture saved: ${name || 'CustomGesture'} → ${key}`);
    pendingLandmarks = null;
  } else {
    showFeedback('Gesture not saved.');
  }
} 