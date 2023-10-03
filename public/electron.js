const { app, BrowserWindow } = require('electron');
const shell = require('electron').shell;

let win = null
const gotTheLock = app.requestSingleInstanceLock()
    
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
    
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(createWindow)

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and require them here.
}

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
    maximizable: false,
    icon: "public/favicon.png",
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    // open url in a browser and prevent default
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.removeMenu();

  var isDev = process.env.APP_DEV ? (process.env.APP_DEV.trim() == "true") : false;
  if (isDev) {
    win.loadURL('http://localhost:3000');
      // Open the DevTools.
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile("dist/index.html").then(() => {
      win.setTitle("Otoplo Wallet " + app.getVersion());
    });
  }
}

