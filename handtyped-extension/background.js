chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startDetection' || message.action === 'stopDetection' || message.action === 'addGesture') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['contentScript.js']
      }, () => {
        chrome.tabs.sendMessage(tabs[0].id, message);
      });
    });
  }
});
