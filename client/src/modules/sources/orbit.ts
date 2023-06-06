import {Mod, ModWrapper} from '../modwrapper'
import {odb} from '../db'
import {ModSourceAbs} from './modsource'

export type OrbitParams = {
  dburl: string,
  writable: boolean
}

export class OrbitSource extends ModSourceAbs {
  params: OrbitParams
  db: any
  initialized: Promise<void>

  constructor(params: OrbitParams) {
    super()
    this.params = params
    this.initialized = this.init()
  }

  async close() {
    // await this.db.close()
  }

  async init() {
    this.db = await odb.open(this.params.dburl)

    console.log("ODB: ", this.db.address.toString())
    const me = this

    this.db.events.on('replicated', () => {
      console.log("Replicated")
      me.emit('pack-update');
    })

    await this.db.load()
    me.emit('pack-update');
  }

  async getMods() {
    await this.initialized

    const packs:Mod[] = this.db.query(() => true)

    return packs.map(p => {
      return {
        ...p,
        sources: []
      }
    })
  }

  async addMod(mod: ModWrapper) {
    await this.initialized

    await this.db.put(mod.mod)
  }

}
