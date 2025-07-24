let stream = null;
let video = null;
let tracking = false;
let hands = null;
let camera = null;

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startDetection') {
    startDetection();
  } else if (message.action === 'stopDetection') {
    stopDetection();
  } else if (message.action === 'addGesture') {
    console.log("Add gesture clicked — capture current hand pose here.");
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

  await loadMediaPipeAndStart(video);

  tracking = true;
}

function stopDetection() {
  if (!tracking) return;

  // Stop MediaPipe camera loop
  if (camera && typeof camera.stop === "function") {
    camera.stop();
    camera = null;
  }

  // Stop webcam
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }

  // Remove video element
  if (video) {
    video.remove();
    video = null;
  }

  tracking = false;
  console.log("Detection stopped.");
}

async function loadMediaPipeAndStart(videoEl) {
  const Hands = (await import(chrome.runtime.getURL("lib/mediapipe/hands.js"))).Hands;
  const Camera = (await import(chrome.runtime.getURL("lib/mediapipe/camera_utils.js"))).Camera;

  hands = new Hands({
  locateFile: (file) => chrome.runtime.getURL(`lib/mediapipe/${file}`)
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
      console.log("Landmarks:", landmarks);
    }
  });

  camera = new Camera(videoEl, {
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
