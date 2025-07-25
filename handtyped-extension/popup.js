document.getElementById('startBtn').onclick = () => {
  chrome.runtime.sendMessage({ action: 'startDetection' });
};

document.getElementById('stopBtn').onclick = () => {
  chrome.runtime.sendMessage({ action: 'stopDetection' });
};

document.getElementById('addGestureBtn').onclick = () => {
  chrome.runtime.sendMessage({ action: 'addGesture' });
};
document.getElementById('stopBtn').addEventListener('click', () => {
  console.log("Popup: stop button clicked");
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log("Popup: sending 'stopDetection' to", tabs[0].id);
    chrome.tabs.sendMessage(tabs[0].id, { action: 'stopDetection' });
  });
});
