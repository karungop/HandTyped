const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const robot = require('robotjs');
const isDev = require('electron-is-dev');

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

  win.webContents.openDevTools();
  
  if (isDev) {
    win.loadURL('http://localhost:8080');
  } else {
    console.log('Loading production file:', path.join(__dirname, '../dist/index.html'));
    // Check if the file exists
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(indexPath)) {
      console.log('Production file exists, loading...');
      win.loadFile(indexPath);
    } else {
      console.error('Production file does not exist at:', indexPath);
      console.log('Available files in dist directory:');
      const distPath = path.join(__dirname, '../dist');
      if (fs.existsSync(distPath)) {
        const files = fs.readdirSync(distPath);
        console.log(files);
      } else {
        console.log('dist directory does not exist');
      }
    }
  }
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
  const gestures = JSON.parse(fs.readFileSync(gesturePath, 'utf-8') || '[]');
  const updated = gestures.filter(g => g.name !== gestureName);
  fs.writeFileSync(gesturePath, JSON.stringify(updated, null, 2), 'utf-8');
});

app.whenReady().then(createWindow);


