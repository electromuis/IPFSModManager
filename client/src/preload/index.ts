import { ipcRenderer, contextBridge } from 'electron'
// import { electronAPI } from '@electron-toolkit/preload'

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

contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    // contextBridge.exposeInMainWorld('electron', electronAPI)
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
