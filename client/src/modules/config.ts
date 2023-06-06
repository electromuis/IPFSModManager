import {InstalledParams} from './sources/installed'
import {OrbitParams} from './sources/orbit'
import {PinnedParams} from './sources/pinned'
import {ClusterParams} from './sources/cluster'
import fs from 'fs'

export type SourceConfig = {
  name: string,
  type: string,
  installed?: InstalledParams,
  orbit?: OrbitParams,
  pinned?: PinnedParams,
  cluster?: ClusterParams
}

export type Config = {
  sources: SourceConfig[],
  bootstrap: string[],
  repopath: string,
  mountPath: string
}

export let config: Config = {
  sources: [
    {
      name: "Installed",
      type: 'installed',
      installed: {
        gamedir: 'C:/Games/StepMania 5.1',
        modroots: [
          '/Songs'
        ]
      }
    },
    {
      name: "Orbit",
      type: 'orbit',
      orbit: {
        dburl: '/orbitdb/..../moddb',
        writable: true
      }
    },
    {
      name: "Downloaded",
      type: 'pinned',
      pinned: {
        mfsroot: '/Mods',
      }
    },
    {
      name: "Cluster",
      type: 'cluster',
      cluster: {
        root: '/Mods',
        token: '....',
        name: 'maincluster',
        url: 'https://....',
      }
    }
  ],

  bootstrap: [
    '/dns/..../tcp/4001/p2p/....',
  ],

  repopath: './dlmrepo',
  mountPath: 'C:\\dev\\smdlm2\\mount'
}

const configFilename = './config.json'
if(fs.existsSync(configFilename)) {
  const configData = fs.readFileSync(configFilename, 'utf8')
  config = JSON.parse(configData)
}

console.log(JSON.stringify(config, null, 2))
