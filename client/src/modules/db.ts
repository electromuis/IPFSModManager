import OrbitDB from 'orbit-db';
import config from './config';
import fs from 'fs';
import { multiaddr } from '@multiformats/multiaddr'
import concurrently from 'concurrently';
import {closeSources} from './modmodule'
import {exec} from 'child_process'

import Logger from 'logplease';
Logger.setLogLevel('DEBUG');

export const clusterBin = 'bin\\ipfs-cluster-follow.exe'
export const ipfsBin = 'bin\\ipfs.exe'

const mountBin = 'bin\\ipfs-mount.exe'

let emitter: any = null;
export function setEmitter(e: any) {
  emitter = e;
}

export function emit(type) {
  if(emitter) {
    emitter(type)
  }
}

export let odb: OrbitDB|null = null;

export let ipfs: any|null = null;
let taskHandles: any[] = [];

export function spawnTasks(tasks) {
  let { commands } = concurrently(tasks)

  taskHandles = [
    ...taskHandles,
    ...commands
  ]
}

export async function initDB() {
    const OrbitDBMod = (await import('orbit-db')).default;
    const CtlMod = (await import('ipfsd-ctl'));
    const ipfsHttpModule = (await import('ipfs-http-client'));

    // delete the file ./dlmrepo/api if it exists
    if (fs.existsSync(config.repopath + '/api')) {
        fs.unlinkSync(config.repopath + '/api')
        console.log("Cleaned repo api file")
    }

    // delete the file ./dlmrepo/fs if it exists
    if (fs.existsSync(config.repopath + '/fs')) {
      fs.rmdirSync(config.repopath + '/fs', { recursive: true })
      console.log("Cleaned repo fs file")
    }

    ipfs = await CtlMod.createController({
        ipfsHttpModule,
        ipfsBin,
        type: 'go',
        args: ['--enable-pubsub-experiment'],
        disposable: false,
        ipfsOptions: {
            repo: config.repopath,
            config: {
              Bootstrap: config.bootstrap,
            }
        }
    })

    // Start IPFS
    ipfs = await ipfs.init()

    // Start tasks
    const serverArg = `-server /unix/${config.repopath}/fs/server`
    const mountDaemon = `${mountBin} daemon ${serverArg}`
    const mountCommand = `${mountBin} mount fuse ipfs -ipfs /ip4/127.0.0.1/tcp/5001 ${serverArg} ${config.mountPath}`

    await ipfs.start()
    await ipfs.api.id()

    spawnTasks([{ command: mountDaemon, name: 'mount daemon' }])
    await new Promise(resolve => setTimeout(resolve, 2000))
    console.log('Mounting command: ', mountCommand)
    exec(mountCommand)

    // Start OrbitDB
    odb = await OrbitDBMod.createInstance(ipfs.api, {
        directory: config.repopath + '/orbitdb'
    })
}

export async function closeDB() {
  taskHandles.slice().reverse().forEach((handle) => {
    handle.kill()
    console.log('Killed task')
  })
  console.log('Closed 1')

  await closeSources()
  console.log('Closed 2')

  if (ipfs) {
      await ipfs.stop()
      ipfs = null
  }
  console.log('Closed 3')
}
