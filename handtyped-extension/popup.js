document.getElementById('startBtn').onclick = () => {
  chrome.runtime.sendMessage({ action: 'startDetection' });
};

document.getElementById('stopBtn').onclick = () => {
  chrome.runtime.sendMessage({ action: 'stopDetection' });
};

document.getElementById('addGestureBtn').onclick = () => {
  chrome.runtime.sendMessage({ action: 'addGesture' });
};
