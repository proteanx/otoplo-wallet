import { CapacitorHttp } from "@capacitor/core";
import { BrowserWindow, IpcMainInvokeEvent, app, dialog } from "electron";
import fs from 'fs/promises';

export async function checkForUpdates() {
  let version = app.getVersion();
  try {
    let res = await CapacitorHttp.get({ url: "https://release.otoplo.com/otoplo-wallet/info.json", connectTimeout: 3000, readTimeout: 3000 });
    let latest: string = res.data.version;
    if (latest !== version) {
      let option = dialog.showMessageBoxSync({
        type: 'info',
        title: "Wallet Update",
        message: "A new version is now available!",
        detail: `Otoplo Wallet ${latest} is now available. Would you like to download it now?`,
        buttons: ["Yes", "Remind me later"],
        defaultId: 0,
        noLink: true,
        cancelId: 1
      });
      return option == 0 ? latest : false;
    }
  } catch (e) {
    console.log(e)
  }
  return false;
}

export async function exportFile(event: IpcMainInvokeEvent, file: Buffer, title: string, mainWindow: BrowserWindow) {
  let path = dialog.showSaveDialogSync(mainWindow, { defaultPath: `${title}` });
  if (!path) {
    return false;
  }

  try {
    await fs.writeFile(path, file);
    return true;
  } catch (e) {
    throw new Error('Unable to save file')
  }
}