import React, { useEffect, useRef, useState } from 'react';
import { Hands } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import * as cam from '@mediapipe/camera_utils';
import { normalizeLandmarks } from './gestureUtils';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [camera, setCamera] = useState(null);
  const [gestureMap, setGestureMap] = useState({});
  const [showCaptureForm, setShowCaptureForm] = useState(false);
  const [gestureName, setGestureName] = useState('');
  const [gestureKey, setGestureKey] = useState('');
  const [pendingLandmarks, setPendingLandmarks] = useState(null);

  const hands = useRef(null);

  useEffect(() => {
    hands.current = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.current.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.8,
      minTrackingConfidence: 0.8,
    });

    hands.current.onResults(onResults);
  }, []);

  const onResults = (results) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      drawConnectors(ctx, landmarks, Hands.HAND_CONNECTIONS, {
        color: '#00FF00',
      });
      drawLandmarks(ctx, landmarks, { color: '#FF0000' });

      if (showCaptureForm) {
        setPendingLandmarks(normalizeLandmarks(landmarks));
        setShowCaptureForm(false); // Don't keep capturing
      }
    }
  };

  const startCamera = async () => {
    if (typeof videoRef.current !== 'object') return;

    const cameraInstance = new cam.Camera(videoRef.current, {
      onFrame: async () => {
        await hands.current.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });

    cameraInstance.start();
    setCamera(cameraInstance);
  };

  const stopCamera = () => {
    if (camera) {
      camera.stop();
      setCamera(null);
    }
  };

  const captureGesture = async () => {
    setShowCaptureForm(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!gestureName || !gestureKey || !pendingLandmarks) return;

    setGestureMap((prev) => ({
      ...prev,
      [gestureName]: { key: gestureKey, landmarks: pendingLandmarks },
    }));

    setGestureName('');
    setGestureKey('');
    setPendingLandmarks(null);
    alert(`Gesture "${gestureName}" bound to key "${gestureKey}"`);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div>
      <h1>HandTyped – Gesture Training</h1>

      <div style={{ marginBottom: '1rem' }}>
        <button onClick={startCamera} disabled={camera !== null}>
          Start Camera
        </button>
        <button onClick={stopCamera} disabled={camera === null}>
          Stop Camera
        </button>
        <button onClick={captureGesture} disabled={camera === null}>
          Capture Gesture
        </button>
      </div>

      <div style={{ position: 'relative' }}>
        <video
          ref={videoRef}
          width="640"
          height="480"
          autoPlay
          muted
          playsInline
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
        <canvas
          ref={canvasRef}
          width="640"
          height="480"
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
      </div>

      {showCaptureForm && (
        <form onSubmit={handleFormSubmit} style={{ marginTop: '1rem' }}>
          <label>
            Gesture Name:
            <input
              type="text"
              value={gestureName}
              onChange={(e) => setGestureName(e.target.value)}
              required
            />
          </label>
          <br />
          <label>
            Key to Bind:
            <input
              type="text"
              value={gestureKey}
              onChange={(e) => setGestureKey(e.target.value)}
              required
            />
          </label>
          <br />
          <button type="submit">Save Gesture</button>
        </form>
      )}
    </div>
  );
}

export default App;
