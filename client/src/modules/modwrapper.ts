import { spawn } from 'child_process';
import {SourceConfig, config} from './config';
import path from 'path';
import {ipfsBin, emit} from './db'
import glob from 'glob';

import { InstalledSource} from './sources/installed'
import { OrbitSource } from './sources/orbit';
import { PinnedSource } from './sources/pinned';
import { ClusterSource } from './sources/cluster';

let sources = {}

export function getSource(source: SourceConfig) {
  if(!sources[source.name]) {
    switch(source.type) {
      case 'installed':
        if(source.installed)
          sources[source.name] = new InstalledSource(source.installed)
        break
      case 'orbit':
        if(source.orbit)
          sources[source.name] = new OrbitSource(source.orbit)
        break
      case 'pinned':
        if(source.pinned)
          sources[source.name] = new PinnedSource(source.pinned)
        break
      case 'cluster':
        if(source.cluster)
          sources[source.name] = new ClusterSource(source.cluster)
        break
    }
  }

  return sources[source.name]
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

export type ModTask = {
  modId: string,
  task: Promise<any>
  progress: number,
  status: string
}

let tasks: ModTask[] = []

export function getSources()
{
  return config.sources.map(s => {
    return {
      name: s.name,
      type: s.type
    }
  })
}

export class ModWrapper {
  mod: Mod

  constructor(mod:Mod) {
    this.mod = mod

    this.mod.path = this.mod.path.trim().replace(/\\/g, '/')
    this.mod.name = this.mod.name.trim()

    //TODO check modinfo validity, like calculate cid from path
  }

  myTasks() {
    return tasks.filter(t => t.modId == this.mod._id)
  }

  getData() {
    let mySources: any[] = []

    for(let sourceName in sources) {
      mySources.push({
        'name': sourceName,
        'installed': this.mod.sources.includes(sourceName)
      })
    }

    return {
      ...this.mod,
      tasks: this.myTasks(),
      sourceMap: mySources
    }
  }

  async addTo(sourceName: string) {
    const sourceConfig = config.sources.find(s => s.name == sourceName)
    if(!sourceConfig) {
      throw new Error("Source not found")
    }
    await getSource(sourceConfig).addMod(this)

    emit('pack-update');
  }

  async removeFrom(sourceName: string) {
    const sourceConfig = config.sources.find(s => s.name == sourceName)
    if(!sourceConfig) {
      throw new Error("Source not found")
    }
    await getSource(sourceConfig).removeMod(this)

    emit('pack-update');
  }

  async upload(folder:string) {
    // if(!fs.existsSync(path.join(folder, 'modinfo.json'))) {
    //   fs.writeFileSync(path.join(folder, 'modinfo.json'), JSON.stringify(this.mod))
    // }

    let modTask = {
      modId: this.mod._id,
      progress: 0,
      status: 'Uploading',
      task: new Promise(async (resolve) => {

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
                modTask.progress = progress
                emit('pack-update');
            }
        });

        adder.stdout.on('data', (data) => {
            resolve(data.toString().trim());
        });

      })
    }

    tasks.push(modTask)
    emit('pack-update');

    const hash = await modTask.task as string
    console.log(`Mod hash: ${hash}`)
    this.mod.cid = hash
    modTask.status = 'Done'

    this.addTo("Installed")
    this.addTo("Orbit")
    this.addTo("Cluster")

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

    return new ModWrapper(myModInfo)
  }

  static async getAllMods() {
    // getSource('installed')
    // getSource('orbit')
    // getSource('pinned')
    // getSource('cluster')

    let allPacks:any = []

    for(const sourceName of Object.keys(sources)) {
      let packs = await sources[sourceName].getMods()
      packs.forEach(p => {
        p.sources.push(sourceName)
      })
      allPacks.push(packs)
    }

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

    return Object.values(packs).map((pack: any) => new ModWrapper(pack))

  }
}

export function loadSources() {
  for(let source of config.sources) {
    getSource(source)
  }
}
