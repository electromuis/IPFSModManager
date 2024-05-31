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
    console.log("Opening: ", this.params.dburl)
    this.db = await odb.open(this.params.dburl)

    console.log("ODB: ", this.db.address.toString())
    const me = this

    this.db.events.on('replicated', () => {
      console.log("DB replicated")
      me.emit('pack-update');
    })

    this.db.events.on("update", async entry => {
      console.log("DB update: ", entry)
      me.emit('pack-update');
    })

    // await this.db.load()
    me.emit('pack-update');
  }

  async getMods() {
    await this.initialized

    const packs:Mod[] = await this.db.query(() => true)

    console.log("Packs: ", packs)

    return packs.map(p => {
      return {
        ...p,
        sources: []
      }
    })
  }

  async addMod(mod: ModWrapper) {
    
    await this.initialized
    console.log("Adding mod to db", mod);

    const result = await this.db.put(mod.mod)
    console.log("Added mod: ", result);
  }

}
