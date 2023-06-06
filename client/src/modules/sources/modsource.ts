import {Mod, ModWrapper} from '../modwrapper'
import {emit} from '../db'

export abstract class ModSourceAbs {
  abstract getMods(): Promise<Mod[]>
  abstract addMod(mod: ModWrapper): Promise<void>

  async removeMod({}: ModWrapper) {}
  async close() { }

  emit(type) {
    emit(type)
  }
}
