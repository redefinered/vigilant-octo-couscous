import { app, BrowserWindow, session } from 'electron';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import { ipcMain } from 'electron';
import WebSocket from 'ws';
import { spawn } from 'child_process';
import path from 'path';

let accBridgeProcess: any = null;

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (process.argv.some(arg => arg.startsWith('--squirrel'))) {
  process.exit(0);
}

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-eval'; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com"
        ],
      },
    });
  });

  let bridgePath;
  if (app.isPackaged) {
    // Use the path where extraResource puts ACCBridge.exe in the packaged app (no subfolder)
    bridgePath = path.join(process.resourcesPath, 'ACCBridge.exe');
  } else {
    // In development, use the output from dotnet publish or a local build
    bridgePath = path.join(__dirname, '..', 'ACCBridge', 'publish', 'ACCBridge.exe');
  }
  accBridgeProcess = spawn(bridgePath, [], { detached: true, stdio: 'ignore', windowsHide: true });

  installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => console.log(`Added Extension:  ${name}`))
    .catch((err) => console.log('An error occurred: ', err));
  createWindow();
});

// WebSocket connection to ACCBridge
const WEBSOCKET_URL = 'ws://localhost:1337/telemetry';
let latestTelemetry: any = {};
let wsConnected = false;
let wsError: string | null = null;
let wsClient: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;

function connectToACCBridge() {
  if (wsClient) {
    try { wsClient.close(); } catch {}
    wsClient = null;
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  wsClient = new WebSocket(WEBSOCKET_URL);
  
  wsClient.on('open', () => {
    wsConnected = true;
    wsError = null;
    console.log('Connected to ACCBridge WebSocket');
  });
  
  wsClient.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      latestTelemetry = parsed;
    } catch (e) {
      console.error('Failed to parse ACCBridge WebSocket data:', e);
    }
  });
  
  wsClient.on('close', () => {
    wsConnected = false;
    wsError = 'Connection to ACCBridge closed.';
    console.log('Disconnected from ACCBridge WebSocket');
    if (wsClient) {
      try { wsClient.close(); } catch {}
      wsClient = null;
    }
    reconnectTimeout = setTimeout(connectToACCBridge, 5000);
  });
  
  wsClient.on('error', (err) => {
    wsConnected = false;
    wsError = 'Cannot connect to ACCBridge: ' + err.message;
    console.error('ACCBridge WebSocket error:', err);
    if (wsClient) {
      try { wsClient.close(); } catch {}
      wsClient = null;
    }
    reconnectTimeout = setTimeout(connectToACCBridge, 5000);
  });
}

connectToACCBridge();

ipcMain.handle('get-telemetry', async () => {
  if (wsError) {
    return { error: wsError };
  }
  if (latestTelemetry && Object.keys(latestTelemetry).length > 0) {
    return {
      fuel: latestTelemetry.fuel,
      currentLapTime: latestTelemetry.currentLapTime,
      lastLapTime: latestTelemetry.lastLapTime,
      bestLapTime: latestTelemetry.bestLapTime,
      speed: latestTelemetry.speed,
      rpm: latestTelemetry.rpm,
      gear: latestTelemetry.gear,
      throttle: latestTelemetry.throttle,
      brake: latestTelemetry.brake,
      steer: latestTelemetry.steer,
      tyrePressure: latestTelemetry.tyrePressure,
      tyreTemp: latestTelemetry.tyreTemp,
      rideHeight: latestTelemetry.rideHeight,
      brakeTemp: latestTelemetry.brakeTemp,
      sessionType: latestTelemetry.sessionType,
      track: latestTelemetry.track
    };
  } else {
    return {
      fuel: 50.0,
      currentLapTime: 120.5,
      lastLapTime: 130.0,
      bestLapTime: 119.0,
      speed: 180.0,
      rpm: 6000,
      gear: 3,
      throttle: 0.8,
      brake: 0.0,
      steer: 0.1
    };
  }
});

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

app.on('will-quit', () => {
  if (accBridgeProcess) {
    accBridgeProcess.kill();
  }
});