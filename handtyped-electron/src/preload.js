const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveGesture: (gesture) => ipcRenderer.send('save-gesture', gesture),
  getGestures: () => ipcRenderer.invoke('get-gestures'),
  pressKey: (key) => ipcRenderer.send('press-key', key),
  deleteGesture: (name) => ipcRenderer.send('delete-gesture', name),
});

