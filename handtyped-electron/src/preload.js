const fs = require('fs');
const path = require('path');
const { contextBridge, ipcRenderer } = require('electron');
const { app } = require('@electron/remote');

const gesturesPath = path.join(app.getPath('userData'), 'gestures.json');

contextBridge.exposeInMainWorld('electronAPI', {
  saveGesture: (gestureData) => ipcRenderer.send('save-gesture', gestureData),
  onGestureSaved: (callback) => ipcRenderer.on('gesture-saved', callback),
});
