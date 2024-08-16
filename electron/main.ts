import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { checkForUpdates, exportFile } from './utils';

let mainWindow: BrowserWindow;
const gotTheLock = app.requestSingleInstanceLock();

const _dirname = dirname(fileURLToPath(import.meta.url));

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 768,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    maximizable: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon: join(_dirname, 'favicon.png') } : {}),
    webPreferences: {
      preload: join(_dirname, 'preload.mjs'),
      sandbox: false
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  })

  mainWindow.removeMenu();

  // Load the remote URL for development or the local html file for production.
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(_dirname, 'index.html')).then(() => {
      mainWindow.setTitle("Otoplo Wallet " + app.getVersion());
    });
  }
}

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(() => {
    checkForUpdates().then(res => {
      if (res) {
        let url = "";
        switch (process.platform) {
          case 'darwin':
            url = `https://release.otoplo.com/otoplo-wallet/${res}/otoplo-wallet-osx-${res}.dmg`;
            break;
          case 'linux':
            url = `https://release.otoplo.com/otoplo-wallet/${res}/otoplo-wallet-linux-x64-${res}.tar.gz`;
            break;
          case 'win32':
            url = `https://release.otoplo.com/otoplo-wallet/${res}/otoplo-wallet-win-setup-${res}.exe`;
            break;
          default:
            url = `https://release.otoplo.com/otoplo-wallet/${res}/`;
            break;
        }
        shell.openExternal(url).finally(() => {
          app.quit();
        });
      } else {
        createWindow();
      }
    });

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    });

    ipcMain.handle('export-file', (event, file: Buffer, title: string) => exportFile(event, file, title, mainWindow));
  });

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  });
}