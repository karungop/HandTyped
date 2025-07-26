export function normalizeLandmarks(landmarks) {
  if (!landmarks || landmarks.length === 0) return [];

  const baseX = landmarks[0].x;
  const baseY = landmarks[0].y;

  return landmarks.map(pt => ({
    x: +(pt.x - baseX).toFixed(4),
    y: +(pt.y - baseY).toFixed(4),
  }));
}
