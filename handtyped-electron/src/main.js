const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadURL('http://localhost:8080'); // or loadFile if using static
}

const gesturePath = path.join(__dirname, 'gesture.json');

ipcMain.on('save-gesture', (event, gestureData) => {
  try {
    let existing = [];
    if (fs.existsSync(gesturePath)) {
      const raw = fs.readFileSync(gesturePath);
      if (raw.length > 0) existing = JSON.parse(raw);
    }

    existing.push(gestureData);
    fs.writeFileSync(gesturePath, JSON.stringify(existing, null, 2));
    console.log('Gesture saved:', gestureData);
  } catch (err) {
    console.error('Failed to save gesture:', err);
  }
});





app.whenReady().then(createWindow);
