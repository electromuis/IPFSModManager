import { spawn } from 'child_process';
import config from './config';
import fs from 'fs';
import path from 'path';
import {ipfs, ipfsBin, emit} from './db'
import glob from 'glob';

import { ModSourceAbs } from './sources/modsource';
import { InstalledSource} from './sources/installed'
import { OrbitSource } from './sources/orbit';
import { PinnedSource } from './sources/pinned';
import { ClusterSource } from './sources/cluster';

let sources = {}

export function getSource(sourceName:string) {
  if(!sources[sourceName]) {
    switch(sourceName) {
      case 'installed':
        sources[sourceName] = new InstalledSource(config.installed)
        break
      case 'orbit':
        sources[sourceName] = new OrbitSource(config.orbit)
        break
      case 'pinned':
        sources[sourceName] = new PinnedSource(config.pinned)
        break
      case 'cluster':
        sources[sourceName] = new ClusterSource(config.cluster)
        break
    }
  }

  return sources[sourceName]
}

export async function closeSources() {
  for(let sourceName in sources) {
    await sources[sourceName].close()
  }
}

export type Mod = {
  _id: string,
  cid?: string,
  path: string,
  name: string,
  image? : string,
  installed?: boolean,
  available?: boolean
  createdAt?: string,
  version?: number,
  infoVersion?: number,
  sources: string[]
}



export class ModModule {
  mod: Mod

  constructor(mod:Mod) {
    this.mod = mod

    this.mod.path = this.mod.path.trim().replace(/\\/g, '/')
    this.mod.name = this.mod.name.trim()

    //TODO check modinfo validity, like calculate cid from path
  }

  async install() {
    await getSource('pinned').addMod(this)
    await getSource('installed').addMod(this)

    emit('pack-update');
  }

  async uninstall() {
    getSource('installed').removeMod(this)

    emit('pack-update');
  }

  async upload(folder:string) {
    if(!fs.existsSync(path.join(folder, 'modinfo.json'))) {
      fs.writeFileSync(path.join(folder, 'modinfo.json'), JSON.stringify(this.mod))
    }

    const adder = spawn(ipfsBin, [
      'add',
        '-r',
        '-Q',
        '-p',
        '--pin=true',
        `"${folder}"`
    ], {
      shell: true,
      env: {
        IPFS_PATH: config.repopath
      }
    });

    adder.stderr.on('data', (data) => {
        // regex match for progress
        const progress = parseFloat(data.toString().match(/[\d\.]+%/g));
        if(progress) {
            process.stdout.write(`\r Progress: ${progress}%`);
        }
    });

    const hash:string = await new Promise((resolve) => {
        adder.stdout.on('data', (data) => {
            resolve(data.toString().trim());
        });
      }
    );

    console.log(`Mod hash: ${hash}`)

    this.mod.cid = hash

    await getSource('pinned').addMod(this)
    await getSource('orbit').addMod(this)
    if(config.cluster) {
      await getSource('cluster').addMod(this)
    }

    console.log("Uploaded mod", this.mod);
    emit('pack-update');
  }

  static async fromFolder(folder:string) {
    folder = folder.replace(/\\/g, '/')
    const pts = folder.split('/')
    const modPath = '/' + pts[pts.length - 2] + '/' + pts[pts.length - 1]

    const now = (new Date().toISOString());

    let myModInfo:Mod = {
      _id: modPath,
      name: path.basename(folder),
      path: modPath,
      infoVersion: 1,
      version: 1,
      createdAt: now,
      sources: []
    };

    // search for the first png or jpg in folder using glob
    const files:string[] = await new Promise((resolve, reject) => {
      glob(path.join(folder, '*.{png,jpg}'), (err, files) => {
        if(err) {
          reject(err)
        } else {
          resolve(files)
        }
      })
    })

    if(files.length > 0) {
      myModInfo.image = path.basename(files[0])
    }

    return new ModModule(myModInfo)
  }

  static async getAllMods() {
    // getSource('installed')
    // getSource('orbit')
    // getSource('pinned')
    // getSource('cluster')

    const modSources:ModSourceAbs[] = Object.values(sources)

    let allPacks = await Promise.all(modSources.map(async (source) => {
      return await source.getMods()
    }))

    let packs:Mod[] = allPacks.flat()

    packs = packs.reduce((acc: any, pack: any) => {
      if(acc[pack._id]) {
        acc[pack._id] = {
          ...acc[pack._id],
          ...pack,
          sources: [...acc[pack._id].sources, ...pack.sources]
        }
      } else {
        acc[pack._id] = pack
      }
      return acc
    }, {})

    return Object.values(packs).map((pack: any) => new ModModule(pack))

  }
}

export function loadSources() {
  getSource('installed')
  getSource('orbit')
  getSource('pinned')
  if(config.cluster) {
    getSource('cluster')
  }
}
