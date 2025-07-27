export function normalizeLandmarks(landmarks) {
  if (!landmarks || landmarks.length === 0) return [];

  // Use the wrist (landmark 0) as the base point for normalization
  const baseX = landmarks[0].x;
  const baseY = landmarks[0].y;

  return landmarks.map(pt => ({
    x: +(pt.x - baseX).toFixed(4),
    y: +(pt.y - baseY).toFixed(4),
  }));
}

export function compareLandmarks(l1, l2) {
  if (!l1 || !l2 || l1.length !== l2.length) return false;
  
  let totalDiff = 0;
  let maxDiff = 0;
  
  for (let i = 0; i < l1.length; i++) {
    const diffX = Math.abs(l1[i].x - l2[i].x);
    const diffY = Math.abs(l1[i].y - l2[i].y);
    const pointDiff = diffX + diffY;
    
    totalDiff += pointDiff;
    maxDiff = Math.max(maxDiff, pointDiff);
  }
  
  const avgDiff = totalDiff / l1.length;
  const threshold = 0.15; // Slightly more lenient threshold
  
  // Debug logging
  // console.log(`Gesture comparison - Avg diff: ${avgDiff.toFixed(4)}, Max diff: ${maxDiff.toFixed(4)}, Threshold: ${threshold}`);
  
  return avgDiff < threshold;
}

// New function to find the best matching gesture
export function findBestMatch(currentLandmarks, savedGestures) {
  if (!currentLandmarks || !savedGestures || savedGestures.length === 0) {
    return null;
  }

  let bestMatch = null;
  let bestScore = Infinity;

  for (const gesture of savedGestures) {
    if (compareLandmarks(currentLandmarks, gesture.landmarks)) {
      // Calculate a more detailed score
      let totalDiff = 0;
      for (let i = 0; i < currentLandmarks.length; i++) {
        totalDiff += Math.abs(currentLandmarks[i].x - gesture.landmarks[i].x) + 
                     Math.abs(currentLandmarks[i].y - gesture.landmarks[i].y);
      }
      const avgDiff = totalDiff / currentLandmarks.length;
      
      if (avgDiff < bestScore) {
        bestScore = avgDiff;
        bestMatch = gesture;
      }
    }
  }

  return bestMatch;
}