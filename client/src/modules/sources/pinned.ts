import {Mod, ModWrapper} from '../modwrapper'
import {ModSourceAbs} from './modsource'
import {ipfs, ipfsBin} from '../db'
import {config} from '../config'
import { spawn } from 'child_process';
import fs from 'fs';

export type PinnedParams = {
  mfsroot: string
}

export class PinnedSource extends ModSourceAbs {
  params: PinnedParams

  constructor(params: PinnedParams) {
    super()
    this.params = params
  }

  async getMods() {
    let packs: Mod[] = []

    try {
      for await (const pin of ipfs.api.files.ls(this.params.mfsroot + "/id")) {
        // load modinfo.json within the cid
        const modInfo = JSON.parse((await ipfs.api.files.read(`${this.params.mfsroot}/id/${pin.cid}/modinfo.json`)).toString())

        packs.push({
          _id: pin.name,
          ...modInfo,
          available: true,
          sources: ['pinned']
        })
      }
    } catch (e) {}

    return packs
  }

  async addMod(mod: ModWrapper) {
    const adder = spawn(ipfsBin, [
      'pin',
      'add',
      '-r',
      '--progress',
      `${mod.mod.cid}`
      ], {
        shell: true,
        env: {
          IPFS_PATH: config.repopath
        }
      });

      adder.stderr.on('data', (data) => {
        console.log('Adder 2: ', data.toString())
        // regex match for progress
        const progress = parseFloat(data.toString().match(/[\d\.]+%/g));
        if(progress) {
            process.stdout.write(`\r Progress: ${progress}%`);
        }
      });

      adder.stdout.on('data', (data) => {
        console.log('Adder 1: ', data.toString())

        const progress = parseFloat(data.toString().match(/[\d\.]+%/g));
        if(progress) {
            process.stdout.write(`\r Progress: ${progress}%`);
        }
      })

      await new Promise((resolve, reject) => {
        adder.on('close', (code) => {
          if(code === 0) {
            resolve(void 0)
          } else {
            reject()
          }
        })
      })

      await this.installMfs(mod)
  }

  async installMfs(mod: ModWrapper) {
    try {
      await ipfs.api.files.cp(`/ipfs/${mod.mod.cid}`, `${this.params.mfsroot}/${mod.mod.path}`, { parents: true })


      const mfsHash = (await ipfs.api.files.flush(`${this.params.mfsroot}`)).toString()
      const mfsTarget = `${config.mountPath}-mfs`
      if(fs.existsSync(mfsTarget)) {
        fs.unlinkSync(mfsTarget)
      }
      fs.symlinkSync(`${config.mountPath}\\${mfsHash}`, `${config.mountPath}-mfs`, 'junction')

    } catch(e) {
      console.log("MFS install failed: ", e)
    }
  }

}
