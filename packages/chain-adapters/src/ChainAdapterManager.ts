import { ChainAdapter, ChainIdentifier } from './api'
import { BitcoinChainAdapter } from './bitcoin'
import { EthereumChainAdapter } from './ethereum'
import { Ethereum, Bitcoin } from '@shapeshiftoss/unchained-client'

export type UnchainedUrls = Record<ChainIdentifier.Ethereum | ChainIdentifier.Bitcoin, string>

const chainAdapterMap = {
  [ChainIdentifier.Bitcoin]: BitcoinChainAdapter,
  [ChainIdentifier.Ethereum]: EthereumChainAdapter
} as const

const unchainedClientMap = {
  [ChainIdentifier.Ethereum]: (url: string): Ethereum.V1Api => {
    const config = new Ethereum.Configuration({ basePath: url })
    return new Ethereum.V1Api(config)
  },
  [ChainIdentifier.Bitcoin]: (url: string): Bitcoin.V1Api => {
    const config = new Bitcoin.Configuration({ basePath: url })
    return new Bitcoin.V1Api(config)
  }
}

type ChainAdapterKeys = keyof typeof chainAdapterMap

export class ChainAdapterManager {
  private supported: Map<ChainAdapterKeys, () => ChainAdapter> = new Map()
  private instances: Map<string, ChainAdapter> = new Map()

  constructor(unchainedUrls: UnchainedUrls) {
    if (!unchainedUrls) {
      throw new Error('Blockchain urls required')
    }
    ;(Object.keys(unchainedUrls) as Array<ChainAdapterKeys>).forEach((key: ChainAdapterKeys) => {
      const Adapter = chainAdapterMap[key]
      if (!Adapter) throw new Error(`No chain adapter for ${key}`)
      this.addChain(
        key,
        () => new Adapter({ provider: unchainedClientMap[key](unchainedUrls[key]) })
      )
    })
  }

  /**
   * Add support for a network by providing a class that implements ChainAdapter
   *
   * @example
   * import { ChainAdapterManager, UtxoChainAdapter } from 'chain-adapters'
   * const manager = new ChainAdapterManager(client)
   * manager.addChain('BTG', () => new UtxoChainAdapter('BTG', client))
   * @param {ChainAdapterKeys} network - Coin/network symbol from Asset query
   * @param {Function} factory - A function that returns a ChainAdapter instance
   */
  addChain(chain: ChainAdapterKeys, factory: () => ChainAdapter): void {
    if (typeof chain !== 'string' || typeof factory !== 'function') {
      throw new Error('Parameter validation error')
    }
    this.supported.set(chain, factory)
  }

  getSupportedChains(): Array<ChainAdapterKeys> {
    return Array.from(this.supported.keys())
  }

  getSupportedAdapters(): Array<() => ChainAdapter> {
    return Array.from(this.supported.values())
  }

  /**
   * Get a ChainAdapter instance for a network
   */
  byChain(chain: ChainAdapterKeys): ChainAdapter {
    let adapter = this.instances.get(chain)
    if (!adapter) {
      const factory = this.supported.get(chain)
      if (factory) {
        this.instances.set(chain, factory())
        adapter = this.instances.get(chain)
      }
    }

    if (!adapter) {
      throw new Error(`Network [${chain}] is not supported`)
    }

    return adapter
  }
}
