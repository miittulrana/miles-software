// admin-app/src/main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

function createWindow() {
  // Create the browser window with enhanced security and performance settings
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Admin Application',
    icon: path.join(__dirname, 'assets', 'icon.png'), // Optional: Add application icon
    webPreferences: {
      // Strict security settings
      nodeIntegration: false,
      contextIsolation: true,
      
      // Preload script for bridging IPC communication
      preload: path.join(__dirname, 'preload.js'),
      
      // Security and performance flags
      sandbox: false,
      webSecurity: process.env.NODE_ENV !== 'development', // Disable only in development
      
      // WebGL and GPU acceleration settings
      enableWebGL: true,
      webgl: true,
      
      // Hardware acceleration configurations
      accelerator: "gl",
      additionalArguments: [
        "--ignore-gpu-blacklist",
        "--enable-gpu-rasterization",
        "--enable-zero-copy",
        "--disable-gpu-process-crash-limit",
        `--js-flags=--max-old-space-size=${Math.floor(os.totalmem() / 1024 / 1024 / 2)}` // Dynamic memory allocation
      ]
    }
  });

  // Set Mapbox GL environment variable for Electron compatibility
  process.env.MAPBOX_GL_JS_USE_ELECTRON = 'true';

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Comprehensive error handling for window loading
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
    
    // Show error dialog to the user
    dialog.showErrorBox(
      'Loading Error', 
      `Unable to load the application. Error: ${errorDescription}`
    );
  });

  // Log console messages from the renderer process
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}]: ${message} (Line: ${line}, Source: ${sourceId})`);
  });

  // Handle window close events
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create window when Electron is ready
app.whenReady().then(() => {
  createWindow();
  
  // Set up IPC handlers
  setupIPCHandlers();
});

// Set up IPC handlers for inter-process communication
function setupIPCHandlers() {
  // Example IPC handlers - customize as needed
  ipcMain.handle('get-app-path', () => app.getAppPath());
  
  // Get system information
  ipcMain.handle('get-system-info', () => ({
    platform: process.platform,
    arch: process.arch,
    appPath: app.getAppPath(),
    userData: app.getPath('userData')
  }));
}

// Quit when all windows are closed except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle macOS-specific activate event
app.on('activate', () => {
  // On macOS, recreate a window when the dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Optional: Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  // Show error dialog
  if (mainWindow) {
    dialog.showErrorBox(
      'Unexpected Error', 
      `An unexpected error occurred: ${error.message}`
    );
  }
  
  // Gracefully exit the application
  app.quit();
});