const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');


function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: false,
    },
  });

  win.loadURL('http://localhost:8080');
//   win.webContents.openDevTools();
}

app.whenReady().then(createWindow);
