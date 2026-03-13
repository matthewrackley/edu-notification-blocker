import { contextBridge, ipcRenderer } from 'electron';
import { env } from '../utils/env';

contextBridge.exposeInMainWorld('fileAPI', {
  saveData: async <T extends object> (writeTo: string, data: T) => ipcRenderer.invoke("fileAPI:saveData", { writeTo, ...data }),
});
