import { isStackAdapter } from './contract.js'

export function createStackRegistry(initialAdapters = []) {
  const adapters = new Map()

  const registry = {
    register(adapter) {
      if (!isStackAdapter(adapter)) throw new Error('Only defined stack adapters can be registered')
      if (adapters.has(adapter.id)) throw new Error(`Duplicate stack adapter id: ${adapter.id}`)
      adapters.set(adapter.id, adapter)
      return adapter
    },

    get(id) {
      return adapters.get(id)
    },

    require(id) {
      const adapter = adapters.get(id)
      if (!adapter) throw new Error(`Unknown stack adapter: ${id}`)
      return adapter
    },

    list(kind) {
      const registered = [...adapters.values()]
      return kind ? registered.filter((adapter) => adapter.kind === kind) : registered
    },

    supports(firstId, secondId) {
      const first = registry.require(firstId)
      const second = registry.require(secondId)
      const firstConstraint = first.compatibleWith[second.kind]
      const secondConstraint = second.compatibleWith[first.kind]
      return (!firstConstraint || firstConstraint.includes(second.id)) &&
        (!secondConstraint || secondConstraint.includes(first.id))
    },
  }

  for (const adapter of initialAdapters) registry.register(adapter)
  return Object.freeze(registry)
}

