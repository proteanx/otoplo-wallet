import { contextBridge, ipcRenderer } from 'electron';

// Custom APIs for renderer
const electronAPI = {
    exportFile: (file: Buffer, title: string): Promise<boolean> => ipcRenderer.invoke('export-file', file, title),
}

try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
} catch (error) {
    console.error(error);
}