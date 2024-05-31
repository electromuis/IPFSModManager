// import OrbitDB from '@orbitdb/core'
// import { createOrbitDB } from '@orbitdb/core'
// import { createHelia } from 'helia'

import { createNode } from 'ipfsd-ctl'
import { path } from 'kubo'
import { create } from 'kubo-rpc-client'

// import { createOrbitDB, Identities, KeyStore } from '@orbitdb/core'
import {config} from './config'
import fs from 'fs';
import concurrently from 'concurrently';
import {closeSources} from './modwrapper'
import {exec} from 'child_process'
import getLibP2pOptions from './util.mjs'
import { multiaddr } from '@multiformats/multiaddr'

export const clusterBin = 'resources\\bin\\ipfs-cluster-follow.exe'
export const ipfsBin = 'resources\\bin\\ipfs.exe'
const mountBin = 'resources\\bin\\ipfs-mount.exe'

let emitter: any = null;
export function setEmitter(e: any) {
  emitter = e;
}

export function emit(type) {
  if(emitter) {
    emitter(type)
  }
}

export let odb: any = null;
export let helia: any = null;
export let ipfs: any = null;
let taskHandles: any[] = [];

export function spawnTasks(tasks) {
  let { commands } = concurrently(tasks)

  taskHandles = [
    ...taskHandles,
    ...commands
  ]
}

export async function initDB() {
  const HeliaMod = (await import('helia'));
  const OrbitDBMod = (await import('@orbitdb/core'));
  // const CtlMod = (await import('ipfsd-ctl'));

  // delete the file ./dlmrepo/api if it exists
  if (fs.existsSync(config.repopath + '/api')) {
    fs.unlinkSync(config.repopath + '/api')
    console.log('Cleaned repo api file')
  }

  // delete the file ./dlmrepo/fs if it exists
  if (fs.existsSync(config.repopath + '/fs')) {
    fs.rmdirSync(config.repopath + '/fs', { recursive: true })
    console.log('Cleaned repo fs file')
  }

  // Start IPFS
  helia = await HeliaMod.createHelia({
    libp2p: await getLibP2pOptions({
      bootstrapList: config.bootstrap
    })
  })
  
  const con = await helia.libp2p.dial(multiaddr(config.bootstrap[0]))
  console.log("Connected to node: ", con)

  ipfs = await createNode({
    type: 'kubo',
    rpc: create,
    bin: path(),
    repo: config.repopath+"/kubo",
    init: {
      config: {
        Bootstrap: config.bootstrap,
      }
    }
  })
  // console.info("Kubo: ", await ipfs.api.id())
  
  console.log('IPFS started')
  helia.libp2p.addEventListener('peer:discovery', (evt) => {
      console.log('found peer: ', evt.detail)
  })

  // ipfs = await CtlMod.createController({
  //   ipfsHttpModule,
  //   ipfsBin,
  //   type: 'go',
  //   args: ['--enable-pubsub-experiment'],
  //   disposable: false,
  //   ipfsOptions: {
  //     repo: config.repopath,
  //     config: {
  //       Bootstrap: config.bootstrap,
  //     }
  //   }
  // })


  // Start tasks
  const serverArg = `-server /unix/${config.repopath}/fs/server`
  const mountDaemon = `${mountBin} daemon ${serverArg}`
  const mountCommand = `${mountBin} mount fuse ipfs -ipfs /ip4/127.0.0.1/tcp/5001 ${serverArg} ${config.mountPath}`

  // await ipfs.start()
  // await ipfs.api.id()

  // spawnTasks([{ command: mountDaemon, name: 'mount daemon' }])
  await new Promise(resolve => setTimeout(resolve, 2000))
  console.log('Mounting command: ', mountCommand)
  // exec(mountCommand)

  // Start OrbitDB
  odb = await OrbitDBMod.createOrbitDB({ipfs: helia, directory: config.repopath + '/orbitdb'})
  console.log('OrbitDB started')
}

export async function closeDB() {
  taskHandles.slice().reverse().forEach((handle) => {
    handle.kill()
    // console.log('Killed task', handle)
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
