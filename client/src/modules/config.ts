import {InstalledParams} from './sources/installed'
import {OrbitParams} from './sources/orbit'
import {PinnedParams} from './sources/pinned'
import {ClusterParams} from './sources/cluster'

export type Config = {
  installed: InstalledParams,
  orbit: OrbitParams,
  pinned: PinnedParams,
  cluster: ClusterParams | null,

  bootstrap: string[],
  repopath: string,
  mountPath: string
}

const config: Config = {
  installed: {
    gamedir: 'C:/Games/StepMania 5.1',
    modroots: [
      '/Songs'
    ]
  },

  orbit: {
    dburl: '/orbitdb/zdpuAtWguka4BBh6b1ZoWaPV17viDiXjyp8wi52mfvX7LdHdU/moddb2'
  },

  pinned: {
    mfsroot: '/Mods4',
  },

  cluster: null,

  // cluster: {
  //   root: '/Mods2',
  //   token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhZG1pbiJ9.eBDr3n5ToAyYHfKPFfrP6FWJZwqO1TR6Qt8qmkkHQvA',
  //   name: 'maincluster',
  //   url: 'http://127.0.0.1:9010',
  //   joinconfig: 'http://127.0.0.1:8080/ipfs/Qmb7WE1EDpSuHBmsNL3sDJw6xRvkqWYpvFepN16rNSpw2D'
  // },

  bootstrap: [
    '/ip4/127.0.0.1/tcp/4002/p2p/12D3KooWDpoJsQejF9a8eBzMyxEoyrkbTje6fjVeGq1PMKeRC8ch',
  ],

  repopath: './dlmrepo',
  mountPath: 'C:\\dev\\smdlm2\\mount'
}

export default config
