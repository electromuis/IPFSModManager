import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getPacks: () => ipcRenderer.invoke('getPacks'),
  installPack: (pack, sourceName) => ipcRenderer.invoke('installPack', pack, sourceName),
  uninstallPack: (pack, sourceName) => ipcRenderer.invoke('uninstallPack', pack, sourceName),
  uploadPack: (folder, pack) => ipcRenderer.invoke('uploadPack', folder, pack),
  selectFolder: () => ipcRenderer.invoke('selectFolder'),
  getSources: () => ipcRenderer.invoke('getSources')
}

ipcRenderer.on('pack-update', () => {
  console.log('pack-update')
})

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
