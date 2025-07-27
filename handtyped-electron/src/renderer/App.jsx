import React, { useEffect, useRef, useState } from 'react';
import { Hands } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import * as cam from '@mediapipe/camera_utils';
import { normalizeLandmarks, compareLandmarks, findBestMatch } from './gestureUtils';
import './App.css';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [camera, setCamera] = useState(null);
  const [gestureName, setGestureName] = useState('');
  const [gestureKey, setGestureKey] = useState('');
  const [pendingLandmarks, setPendingLandmarks] = useState(null);
  const [message, setMessage] = useState('');
  const [currentGesture, setCurrentGesture] = useState(null);
  const hands = useRef(null);
  const [savedGestures, setSavedGestures] = useState([]);
  const lastLogTimeRef = useRef(0); 

  const onResults = (results) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      drawConnectors(ctx, landmarks, Hands.HAND_CONNECTIONS, { color: '#00FF00' });
      drawLandmarks(ctx, landmarks, { color: '#FF0000' });

      const normalized = normalizeLandmarks(landmarks);
      
      // Use the new findBestMatch function for better gesture recognition
      const matchedGesture = findBestMatch(normalized, savedGestures);
      
      if (matchedGesture) {
        const now = Date.now();
        if (now - lastLogTimeRef.current > 500) {
        lastLogTimeRef.current = now;
        setCurrentGesture(matchedGesture);
        console.log(`Detected gesture: ${matchedGesture.name}, key bind: ${matchedGesture.key}`);
        setMessage(`Detected: ${matchedGesture.name} (${matchedGesture.key})`);
        if (window.electronAPI?.pressKey) {
            window.electronAPI.pressKey(matchedGesture.key);
         }
        }
        
      } else {
        setCurrentGesture(null);
        setMessage('No gesture detected');
      }
    } else {
      setCurrentGesture(null);
      setMessage('No hand detected');
    }
  };

  useEffect(() => {
    hands.current = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.current.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.8,
      minTrackingConfidence: 0.8,
    });

    hands.current.onResults(onResults);

    if (window.electronAPI?.getGestures) {
    window.electronAPI.getGestures().then((gestures) => {
      setSavedGestures(gestures);
      console.log('Loaded gestures:', gestures);
    });
    }
  }, []);

  

  const startCamera = async () => {
    if (typeof videoRef.current !== 'object') return;

    // Ensure onResults is set to the main recognition function
    hands.current.onResults(onResults);

    const cameraInstance = new cam.Camera(videoRef.current, {
      onFrame: async () => {
        await hands.current.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });

    cameraInstance.start();
    console.log('Start camera clicked - gesture recognition active');
    setCamera(cameraInstance);
    
    // Set initial message to indicate recognition is active
    setMessage('Camera started - gesture recognition active');
  };

  const stopCamera = () => {
    if (camera) {
      camera.stop();
      console.log('Stop camera clicked');
      setCamera(null);
    }
  };

  const captureGesture = async () => {
    if (!camera) {
      alert('Camera not active.');
      return;
    }

    const captureOnce = (results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = normalizeLandmarks(results.multiHandLandmarks[0]);
        setPendingLandmarks(landmarks);
        setMessage('Gesture captured! Ready to save.');
      } else {
        setMessage('No hand detected. Try again.');
      }
      console.log('Gesture captured');
      // Restore the main recognition function
      hands.current.onResults(onResults);
    };

    // Temporarily switch to capture mode
    hands.current.onResults(captureOnce);
    await hands.current.send({ image: videoRef.current });
  };

  const saveGesture = () => {
    if (!gestureName) {
      alert('Please enter a gesture name.');
      return;
    }
    if (!gestureKey) {
      alert('Please enter a key bind.');
      return;
    }
    if (!pendingLandmarks) {
      alert('No gesture captured. Press "Capture Gesture" first.');
      return;
    }

    const newGesture = {
      name: gestureName,
      key: gestureKey,
      landmarks: pendingLandmarks,
    };

    // Update both local state and save to electron
    setSavedGestures((prev) => [...prev, newGesture]);

    console.log('electronAPI:', window.electronAPI);
    if (window.electronAPI?.saveGesture) {
        window.electronAPI.saveGesture(JSON.stringify(newGesture));
    } 

    setMessage(`Gesture "${gestureName}" saved with key "${gestureKey}".`);

    setGestureName('');
    setGestureKey('');
    setPendingLandmarks(null);
  };


  return (
    <div className="app">
      <h1>HandTyped – Gesture Training</h1>

      <div className="controls">
        <button onClick={startCamera} disabled={camera !== null}>
          Start Camera
        </button>
        <button onClick={stopCamera} disabled={camera === null}>
          Stop Camera
        </button>
      </div>

      <div className="controls">
        <input
          type="text"
          placeholder="Gesture name"
          value={gestureName}
          onChange={(e) => setGestureName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Key bind (e.g. a, space)"
          value={gestureKey}
          onChange={(e) => setGestureKey(e.target.value)}
        />
        <button onClick={captureGesture} disabled={camera === null}>
          Capture Gesture
        </button>
        <button
          onClick={saveGesture}
          disabled={!gestureName || !gestureKey || !pendingLandmarks}
        >
          Save Gesture
        </button>
      </div>

      <div className="main-content">
        <div className="video-container">
          <video ref={videoRef} style={{ display: 'none' }}  />
          <canvas ref={canvasRef} width={640} height={480} />
          <div>
      {pendingLandmarks && (
        <pre className="landmarks-display">
          {JSON.stringify(pendingLandmarks, null, 2)}
        </pre>
      )}
      </div>
        </div>

        <div className="info-panel">
          <div className="message">{message}</div>

          {currentGesture && (
            <div className="current-gesture">
              <h3>Current Gesture:</h3>
              <p>Name: {currentGesture.name}</p>
              <p>Key: {currentGesture.key}</p>
            </div>
          )}

          <div className="saved-gestures">
            <h3>Saved Gestures ({savedGestures.length}):</h3>
            <ul>
                {savedGestures.map((gesture, index) => (
                    <li key={index}>
                    {gesture.name} → {gesture.key}
                    <button
                        onClick={() => {
                        const updated = savedGestures.filter(g => g.name !== gesture.name);
                        setSavedGestures(updated);
                        setMessage(`Deleted gesture: ${gesture.name}`);
                        if (window.electronAPI?.deleteGesture) {
                            window.electronAPI.deleteGesture(gesture.name);
                        }
                        }}
                        style={{ marginLeft: '10px', color: 'red' }}
                    >
                        Delete
                    </button>
                    </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    
    </div>
  );
}

export default App;
