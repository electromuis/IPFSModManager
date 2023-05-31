import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getPacks: () => ipcRenderer.invoke('getPacks'),
  installPack: (pack) => ipcRenderer.invoke('installPack', pack),
  uninstallPack: (pack) => ipcRenderer.invoke('uninstallPack', pack),
  uploadPack: (folder, pack) => ipcRenderer.invoke('uploadPack', folder, pack),
  selectFolder: () => ipcRenderer.invoke('selectFolder')
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
