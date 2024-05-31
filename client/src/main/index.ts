import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'

import {closeDB, initDB, setEmitter} from '../modules/db'
import {ModWrapper, loadSources, getSources} from '../modules/modwrapper'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
? path.join(process.env.APP_ROOT, 'public')
: RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,
      
      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })
  
  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }
  
  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })
  
  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344
}

app
.whenReady()
.then(createWindow)
.then(async () => {
  ipcMain.handle('getPacks', async () => {
    const mods = await ModWrapper.getAllMods()
    return mods.map(mod => mod.getData())
  })
  
  ipcMain.handle('getSources', async () => {
    return getSources()
  })
  
  try {
    await initDB()
    loadSources()
  } catch(e) {
    console.log('Load error: ', e)
    closeDB()
    app.quit()
    return
  }
  
  ipcMain.handle('installPack', ({}, pack, source) => {
    const mod = new ModWrapper(pack)
    return mod.addTo(source)
  })
  
  ipcMain.handle('uninstallPack', ({}, pack, source) => {
    const mod = new ModWrapper(pack)
    return mod.removeFrom(source)
  })
  
  ipcMain.handle('selectFolder', async () => {
    // Have the user select a folder
    const folder = dialog.showOpenDialogSync({
      properties: ['openDirectory']
    })
    
    if(!folder) {
      return
    }
    
    const mod = await ModWrapper.fromFolder(folder[0])
    return {mod: mod.mod, folder: folder[0]}
  })
  
  ipcMain.handle('uploadPack', ({}, folder, pack) => {
    console.log("Uploading: ", folder, pack)
    const mod = new ModWrapper(pack)
    mod.upload(folder)
  })
  
  setEmitter(type => {
    console.log('Emitting: ', type)
    BrowserWindow.getAllWindows().forEach(w => {
      w.webContents.send(type)
    })
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  closeDB()
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })
  
  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})
