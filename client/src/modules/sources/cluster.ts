import {Mod, ModWrapper} from '../modwrapper'
import {ModSourceAbs} from './modsource'
import {ipfs, spawnTasks, clusterBin} from '../db'
import { CID } from 'multiformats/cid'
import {exec} from 'child_process'
import {config} from '../config'
import fs from 'fs'

export type ClusterParams = {
  root: string,
  url: string
  token: string,
  name: string,
  joinconfig?: string
}

export class ClusterSource extends ModSourceAbs {
  params: ClusterParams
  initialized: Promise<void>

  constructor(params: ClusterParams) {
    super()
    this.params = params
    this.initialized = this.init()
  }

  async init() {
    const services = await ipfs.api.pin.remote.service.ls()
    const service = services.find(s => s.service == this.params.name)
    if(!service) {
      console.log("Service not found, creating")

      await ipfs.api.pin.remote.service.add(
        this.params.name,
        {
          endpoint: this.params.url,
          key: this.params.token
        }
      )
    }

    if(this.params.joinconfig) {
      const folderArg = `--config ${config.repopath}/follow`

      if(!fs.existsSync(`${config.repopath}/follow/${this.params.name}`)) {
        const initCommand = `${clusterBin} ${folderArg} ${this.params.name} init ${this.params.joinconfig}`
        console.log("Running init command: ", initCommand)

        await new Promise((resolve, reject) => {
          exec(initCommand, (err, stdout, stderr) => {
            if(err) {
              console.log("Error running init command: ", err, stderr)
              reject(err)
              return
            }

            console.log("Init command finished")
            resolve(stdout)
          })
        })
      }

      const socketFile = `${config.repopath}/follow/${this.params.name}/api-socket`
      if(fs.existsSync(socketFile)) {
        console.log("Cleaning old socket file")
        fs.unlinkSync(socketFile)
      }

      const runCommand = `${clusterBin} ${folderArg} ${this.params.name} run`
      spawnTasks([{ command: runCommand, name: 'follow run' }])
    }
  }

  async getMods() {
    await this.initialized

    let mods:Mod[] = []
    let pins = await ipfs.api.pin.remote.ls({
      service: this.params.name,
      status: [
        'pinned',
        'pinning',
        'queued',
        'failed'
      ]
    })

    for await(const pin of pins) {
      if(!pin.name.startsWith(this.params.root)) {
        continue
      }

      let modId = pin.name.substr(this.params.root.length)
      const pts = modId.split('/')
      const modName = pts[pts.length - 1]

      let mod:Mod = {
        _id: modId,
        name: modName,
        path: modId,
        sources: ['cluster-' + pin.status]
      }

      mods.push(mod)
    }

    return mods
  }

  async addMod(mod: ModWrapper) {
    const pinName = this.params.root + mod.mod._id


    await ipfs.api.pin.remote.rm({
      service: this.params.name,
      name: pinName
    })
    console.log("Removed old pins")

    await ipfs.api.pin.remote.add(CID.parse(mod.mod.cid as string), {
      service: this.params.name,
      name: pinName,
      background: true
    })
    console.log("Added new pin: ", pinName)
  }
}

