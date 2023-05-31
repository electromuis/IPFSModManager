import {Mod, ModModule} from '../modmodule'
import {emit} from '../db'

export abstract class ModSourceAbs {
  abstract getMods(): Promise<Mod[]>
  abstract addMod(mod: ModModule): Promise<void>

  async removeMod(mod: ModModule) {}
  async close() { }

  emit(type) {
    emit(type)
  }
}
