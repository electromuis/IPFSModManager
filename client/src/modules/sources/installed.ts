import {Mod, ModWrapper} from '../modwrapper'
import {ModSourceAbs} from './modsource'
import fs from 'fs'
import path from 'path'
import {config} from '../config'

export type InstalledParams = {
  gamedir: string,
  modroots: string[]
}

export class InstalledSource extends ModSourceAbs {
  params: InstalledParams

  constructor(params: InstalledParams) {
    super()
    this.params = params
  }

  async getMods() {
    let packs: Mod[] = []

    // list all files in config.songdir
    for(let modroot of this.params.modroots) {
      const files = fs.readdirSync(this.params.gamedir + modroot, { withFileTypes: true })

      for(let file of files) {
        if(!file.isSymbolicLink()) continue

        const filePath = this.params.gamedir + modroot + '/' + file.name
        const linkTarget = fs.readlinkSync(filePath)
        const cid = path.basename(linkTarget)
        const modPath = modroot + '/' + file.name

        const modInfo:Mod = {
          _id: modPath,
          cid,
          path: modPath,
          name: file.name,
          sources: []
        }

        // if(fs.existsSync(path.join(filePath, 'modinfo.json'))) {
          // const modinfo2 = JSON.parse(fs.readFileSync(path.join(filePath, 'modinfo.json')).toString())
          //TODO compare modinfo
        // }


        packs.push(modInfo)
      }
    }

    return packs
  }

  async addMod(mod: ModWrapper) {
    const packFolder = (this.params.gamedir + mod.mod.path.trim()).replace(/\//g, '\\')
    if(fs.existsSync(packFolder)) {
      console.log("Pack already installed")
      return
    }

    // const pinnedPacks = await sourceIPFS()
    // const packInfo = pinnedPacks.find((p: any) => p._id === mod.mod._id)
    // if(!packInfo) {
    //   await this.fetch()
    // }

    const packTarget = (config.mountPath + '/' + mod.mod.cid).replace(/\//g, '\\')
    fs.symlinkSync(packTarget, packFolder, 'junction')
  }

  async removeMod(mod: ModWrapper) {
    const packFolder = (this.params.gamedir + mod.mod.path.trim()).replace(/\//g, '\\')
    if(!fs.existsSync(packFolder)) {
      console.log("Pack not even installed")
      return
    }

    fs.unlinkSync(packFolder)
    console.log("Unlinked")
  }
}
