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

  win.loadURL('http://localhost:8080'); // or loadFile if using static
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

ipcMain.on('press-key', (event, key) => {
//   console.log(`Pressing key: ${key}`);
  try {
    robot.keyTap(key); // e.g., 'a', 'enter', 'space'
  } catch (err) {
    console.error('Failed to press key with robotjs:', err);
  }
});

app.whenReady().then(createWindow);


