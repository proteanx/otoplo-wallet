import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { isMobilePlatform, isNullOrEmpty, showToast } from "./common.utils";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";

export interface FileProps {
  type: string;
  dir: string;
  name: string;
  content: string;
  encoding?: Encoding
}

export async function shareFile(file: FileProps) {
  if (!isMobilePlatform()) {
    return false;
  }

  try {
    let res = await Filesystem.writeFile({
      path: `otoplo/${file.name}`,
      data: file.content,
      directory: Directory.Cache,
      encoding: file.encoding,
      recursive: true
    });

    await Share.share({ files: [res.uri] });
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function exportFile(file: FileProps) {
  let isSuccess = false;
  try {
    if (isMobilePlatform()) {
      let dir = (Capacitor.getPlatform() === 'ios' ? '' : 'Otoplo/') + (isNullOrEmpty(file.dir) ? '' : `${file.dir}/`);

      await Filesystem.writeFile({
        path: `${dir}${file.name}`,
        data: file.content,
        directory: Directory.Documents,
        encoding: file.encoding,
        recursive: true
      });
      isSuccess = true;
    } else {
      let csvData = Buffer.from(file.content, (file.encoding as BufferEncoding) || 'base64');
      isSuccess = await window.electronAPI.exportFile(csvData, file.name);
    }

    if (isSuccess) {
      showToast('success', `${file.type} Saved!`);
    }
  } catch (e) {
    console.log(e);
    showToast('error', `Failed to export ${file.type}`, {
      position: "top-right",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
    });
  }

  return isSuccess;
}
