export function normalizeLandmarks(landmarks) {
  if (!landmarks || landmarks.length === 0) return [];

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
  for (let i = 0; i < l1.length; i++) {
    totalDiff += Math.abs(l1[i].x - l2[i].x) + Math.abs(l1[i].y - l2[i].y);
  }
  const avgDiff = totalDiff / l1.length;
  const threshold = 0.1;  // Adjust this based on your testing
  return avgDiff < threshold;
}