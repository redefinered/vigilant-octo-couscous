import { app, BrowserWindow, session } from 'electron';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import { ipcMain } from 'electron';
import net from 'net';
import dgram from 'dgram';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require('electron-squirrel-startup')) {
  app.quit();
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
  installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => console.log(`Added Extension:  ${name}`))
    .catch((err) => console.log('An error occurred: ', err));
  createWindow();
});

const TCP_PORT = 9000;
const TCP_PASSWORD = 'asd';
let latestTcpTelemetry: any = {};
let tcpConnected = false;
let tcpError: string | null = null;
let tcpClient: net.Socket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;

function connectToAccBroadcastApi() {
  if (tcpClient) {
    try { tcpClient.destroy(); } catch {}
    tcpClient = null;
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  tcpClient = new net.Socket();
  tcpClient.connect(TCP_PORT, '127.0.0.1', () => {
    tcpConnected = true;
    tcpError = null;
    tcpClient!.write(JSON.stringify({
      "command": "register",
      "connectionPassword": TCP_PASSWORD,
      "name": "ACC Companion"
    }) + '\r\n');
  });
  tcpClient.on('data', (data) => {
    try {
      const messages = data.toString().split('\r\n').filter(Boolean);
      for (const msg of messages) {
        const parsed = JSON.parse(msg);
        latestTcpTelemetry = parsed;
      }
    } catch (e) {
      console.error('Failed to parse ACC TCP data:', e);
    }
  });
  tcpClient.on('close', () => {
    tcpConnected = false;
    tcpError = 'Connection to ACC closed.';
    if (tcpClient) {
      try { tcpClient.destroy(); } catch {}
      tcpClient = null;
    }
    reconnectTimeout = setTimeout(connectToAccBroadcastApi, 10000);
  });
  tcpClient.on('error', (err) => {
    tcpConnected = false;
    tcpError = 'Cannot connect to ACC Broadcast API: ' + err.message;
    if (tcpClient) {
      try { tcpClient.destroy(); } catch {}
      tcpClient = null;
    }
    reconnectTimeout = setTimeout(connectToAccBroadcastApi, 10000);
  });
}

connectToAccBroadcastApi();

const UDP_PORT = 5606;
let latestUdpTelemetry: any = {};

try {
  const udpServer = dgram.createSocket('udp4');
  udpServer.on('message', (msg) => {
    latestUdpTelemetry = { raw: msg.toString('hex') };
  });
  udpServer.bind(UDP_PORT);
} catch (e) {
  console.error('UDP server error:', e);
}

ipcMain.handle('get-telemetry', async () => {
  if (tcpError) {
    return { error: tcpError };
  }
  if (latestTcpTelemetry && Object.keys(latestTcpTelemetry).length > 0) {
    if (latestTcpTelemetry.type === 'RealtimeCarUpdate' && latestTcpTelemetry.car) {
      return {
        fuel: latestTcpTelemetry.car.fuel,
        currentLapTime: latestTcpTelemetry.car.currentLapTime,
        completedLaps: latestTcpTelemetry.car.completedLaps,
        speed: latestTcpTelemetry.car.speedKmh
      };
    }
    if (Array.isArray(latestTcpTelemetry.cars)) {
      const playerCar = latestTcpTelemetry.cars.find((c: any) => c.isPlayerCar);
      if (playerCar) {
        return {
          fuel: playerCar.fuel,
          currentLapTime: playerCar.currentLapTime,
          completedLaps: playerCar.completedLaps,
          speed: playerCar.speedKmh
        };
      }
    }
    return latestTcpTelemetry;
  } else {
    return {
      fuel: 50.0,
      currentLapTime: 120.5,
      completedLaps: 10,
      speed: 180.0
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