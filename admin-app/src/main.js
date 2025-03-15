const { app, BrowserWindow } = require('electron');
const path = require('path');

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Open DevTools
  mainWindow.webContents.openDevTools();
}

// Create window when Electron is ready
app.whenReady().then(createWindow);

// Quit when all windows are closed except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});