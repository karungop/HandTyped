const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const robot = require('robotjs');

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

  // if (isDev) {
win.loadURL('http://localhost:8080');
// } else {
//   win.loadFile(path.join(__dirname, '../public/index.html'));
// }
}

const gesturePath = path.join(__dirname, 'gesture.json');
ipcMain.on('save-gesture', (event, gestureJSON) => {
  const gestureFilePath = path.join(__dirname, 'gesture.json');
  try {
    const currentData = fs.existsSync(gestureFilePath)
      ? JSON.parse(fs.readFileSync(gestureFilePath, 'utf8'))
      : [];

    const parsedGesture = JSON.parse(gestureJSON);
    currentData.push(parsedGesture);

    fs.writeFileSync(gestureFilePath, JSON.stringify(currentData, null, 2));
    // console.log('Saved gesture:', parsedGesture);
  } catch (err) {
    console.error('Error saving gesture:', err);
  }
});

ipcMain.handle('get-gestures', async () => {
  try {
    if (!fs.existsSync(gesturePath)) {
      return [];
    }
    const data = fs.readFileSync(gesturePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading gestures:', err);
    return [];
  }
});

ipcMain.on('press-key', (event, keyString) => {
//   console.log(`Pressing key: ${key}`);
  try {
    const keys = keyString.trim().split(/\s+/); // Split on spaces

    for (const key of keys) {
      const lowerKey = key.toLowerCase();

      // Handle special keys
      if (['enter', 'space', 'tab', 'backspace', 'up', 'down', 'left', 'right', 'escape'].includes(lowerKey)) {
        robot.keyTap(lowerKey);
      }
      // Handle single characters or words (typed one letter at a time)
      else if (lowerKey.length === 1) {
        robot.keyTap(lowerKey);
      } else {
        robot.typeString(key); // fallback for full words
      }
    }
  } catch (err) {
    console.error('Failed to press key with robotjs:', err);
  }
});

// Delete one gesture by name
ipcMain.on('delete-gesture', (event, gestureName) => {
  const gestures = JSON.parse(fs.readFileSync(gesturesFile, 'utf-8') || '[]');
  const updated = gestures.filter(g => g.name !== gestureName);
  fs.writeFileSync(gesturesFile, JSON.stringify(updated, null, 2), 'utf-8');
});

app.whenReady().then(createWindow);


