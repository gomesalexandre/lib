// Allow explicit any since this is a test file
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test EthereumChainAdapter
 * @group unit
 */
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { NativeAdapterArgs, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { numberToHex } from 'web3-utils'

import * as ethereum from './EthereumChainAdapter'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const EOA_ADDRESS = '0x05a1ff0a32bc24265bcb39499d0c5d9a6cb2011c'

const getGasFeesMockedResponse = {
  data: {
    gasPrice: '1',
    maxFeePerGas: '300',
    maxPriorityFeePerGas: '10'
  }
}

const estimateGasMockedResponse = { data: '21000' }

const testMnemonic = 'alcohol woman abuse must during monitor noble actual mixed trade anger aisle'

const getWallet = async (): Promise<HDWallet> => {
  const nativeAdapterArgs: NativeAdapterArgs = {
    mnemonic: testMnemonic,
    deviceId: 'test'
  }
  const wallet = new NativeHDWallet(nativeAdapterArgs)
  await wallet.initialize()

  return wallet
}

jest.mock('axios', () => ({
  get: jest.fn(() =>
    Promise.resolve({
      data: {
        result: [
          {
            source: 'MEDIAN',
            timestamp: 1639978534,
            instant: 55477500000,
            fast: 50180000000,
            standard: 45000000000,
            low: 41000000000
          }
        ]
      }
    })
  )
}))

describe('EthereumChainAdapter', () => {
  let args: ethereum.ChainAdapterArgs = {} as any

  const gasPrice = '42'
  const gasLimit = '42000'
  const erc20ContractAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
  const value = 400

  const chainSpecificWithoutErc20ContractAddress = {
    gasPrice,
    gasLimit
  }

  const chainSpecificWithErc20ContractAddress = {
    ...chainSpecificWithoutErc20ContractAddress,
    erc20ContractAddress
  }
  const getInfoMockResponse = {
    data: { network: 'mainnet' }
  }

  beforeEach(() => {
    args = {
      providers: {
        http: {} as any,
        ws: {} as any
      }
    }
  })
  describe('getBalance', () => {
    it('is unimplemented', () => {
      expect(true).toBeTruthy()
    })
  })

  describe('getFeeData', () => {
    it('should return current ETH network fees', async () => {
      args.providers.http = {
        estimateGas: jest.fn().mockResolvedValue(estimateGasMockedResponse),
        getGasFees: jest.fn().mockResolvedValue(getGasFeesMockedResponse)
      } as any

      const adapter = new ethereum.ChainAdapter(args)

      const data = await adapter.getFeeData({
        to: '0x642F4Bda144C63f6DC47EE0fDfbac0a193e2eDb7',
        value: '123',
        chainSpecific: {
          from: ZERO_ADDRESS,
          contractData: '0x'
        }
      })

      expect(data).toEqual(
        expect.objectContaining({
          average: {
            chainSpecific: {
              gasLimit: '21000',
              gasPrice: '50180000000',
              maxFeePerGas: '300',
              maxPriorityFeePerGas: '10'
            },
            txFee: '1053780000000000'
          },
          fast: {
            chainSpecific: {
              gasLimit: '21000',
              gasPrice: '55477500000',
              maxFeePerGas: '332',
              maxPriorityFeePerGas: '12'
            },
            txFee: '1165027500000000'
          },
          slow: {
            chainSpecific: {
              gasLimit: '21000',
              gasPrice: '41000000000',
              maxFeePerGas: '246',
              maxPriorityFeePerGas: '9'
            },
            txFee: '861000000000000'
          }
        })
      )
    })
  })

  describe('address validation', () => {
    const validAddressTuple = {
      valid: true,
      result: chainAdapters.ValidAddressResultType.Valid
    }

    const invalidAddressTuple = {
      valid: false,
      result: chainAdapters.ValidAddressResultType.Invalid
    }

    describe('validateAddress', () => {
      it('should return true for a valid address', async () => {
        const adapter = new ethereum.ChainAdapter(args)
        const referenceAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
        const expectedReturnValue = validAddressTuple
        const res = await adapter.validateAddress(referenceAddress)
        expect(res).toMatchObject(expectedReturnValue)
      })

      it('should return false for an empty address', async () => {
        const adapter = new ethereum.ChainAdapter(args)
        const referenceAddress = ''
        const expectedReturnValue = invalidAddressTuple
        const res = await adapter.validateAddress(referenceAddress)
        expect(res).toMatchObject(expectedReturnValue)
      })

      it('should return false for an invalid address', async () => {
        const adapter = new ethereum.ChainAdapter(args)
        const referenceAddress = 'foobar'
        const expectedReturnValue = invalidAddressTuple
        const res = await adapter.validateAddress(referenceAddress)
        expect(res).toMatchObject(expectedReturnValue)
      })
    })

    describe('validateEnsAddress', () => {
      it('should return true for a valid .eth address', async () => {
        const adapter = new ethereum.ChainAdapter(args)
        const referenceAddress = 'vitalik.eth'
        const expectedReturnValue = validAddressTuple
        const res = await adapter.validateEnsAddress(referenceAddress)
        expect(res).toMatchObject(expectedReturnValue)
      })

      it('should return false for an empty address', async () => {
        const adapter = new ethereum.ChainAdapter(args)
        const referenceAddress = ''
        const expectedReturnValue = invalidAddressTuple
        const res = await adapter.validateEnsAddress(referenceAddress)
        expect(res).toMatchObject(expectedReturnValue)
      })

      it('should return false for an invalid address', async () => {
        const adapter = new ethereum.ChainAdapter(args)
        const referenceAddress = 'foobar'
        const expectedReturnValue = invalidAddressTuple
        const res = await adapter.validateEnsAddress(referenceAddress)
        expect(res).toMatchObject(expectedReturnValue)
      })

      it('should return false for a valid address directly followed by more chars', async () => {
        const adapter = new ethereum.ChainAdapter(args)
        const referenceAddress = 'vitalik.ethfoobar'
        const expectedReturnValue = invalidAddressTuple
        const res = await adapter.validateEnsAddress(referenceAddress)
        expect(res).toMatchObject(expectedReturnValue)
      })

      it('should return false for a valid address in the middle of a string', async () => {
        const adapter = new ethereum.ChainAdapter(args)
        const referenceAddress = 'asdadfvitalik.ethasdadf'
        const expectedReturnValue = invalidAddressTuple
        const res = await adapter.validateEnsAddress(referenceAddress)
        expect(res).toMatchObject(expectedReturnValue)
      })
    })
  })

  describe('broadcastTransaction', () => {
    it('should correctly call broadcastTransaction', async () => {
      const sendDataResult = 'success'
      args.providers.http = {
        sendTx: jest.fn().mockResolvedValue({ data: sendDataResult })
      } as any
      const adapter = new ethereum.ChainAdapter(args)
      const mockTx = '0x123'
      const result = await adapter.broadcastTransaction(mockTx)
      expect(args.providers.http.sendTx).toHaveBeenCalledWith<any>({ sendTxBody: { hex: mockTx } })
      expect(result).toEqual(sendDataResult)
    })
  })

  describe('buildSendTransaction', () => {
    it('should throw if passed tx has no "to" property', async () => {
      const adapter = new ethereum.ChainAdapter(args)

      const tx = ({
        wallet: await getWallet(),
        value,
        chainSpecific: chainSpecificWithErc20ContractAddress
      } as unknown) as chainAdapters.BuildSendTxInput<ChainTypes.Ethereum>
      await expect(adapter.buildSendTransaction(tx)).rejects.toThrow(
        'EthereumChainAdapter: to is required'
      )
    })

    it('should throw if passed tx has no "value" property', async () => {
      const adapter = new ethereum.ChainAdapter(args)

      const tx = ({
        wallet: await getWallet(),
        to: EOA_ADDRESS,
        chainSpecific: chainSpecificWithoutErc20ContractAddress
      } as unknown) as chainAdapters.BuildSendTxInput<ChainTypes.Ethereum>
      await expect(adapter.buildSendTransaction(tx)).rejects.toThrow(
        'EthereumChainAdapter: value is required'
      )
    })

    it('should return a validly formatted ETHSignTx object for a valid BuildSendTxInput parameter', async () => {
      args.providers.http = {
        getInfo: jest.fn().mockResolvedValue(getInfoMockResponse),
        getAccount: jest.fn<any, any>().mockResolvedValue({
          data: {
            balance: '0',
            unconfirmedBalance: '0',
            nonce: 2,
            tokens: [
              {
                caip19: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
                balance: '424242',
                type: 'ERC20',
                contract: '0xc770eefad204b5180df6a14ee197d99d808ee52d'
              }
            ]
          }
        })
      } as any

      const adapter = new ethereum.ChainAdapter(args)

      const tx = ({
        wallet: await getWallet(),
        to: EOA_ADDRESS,
        value,
        chainSpecific: chainSpecificWithoutErc20ContractAddress
      } as unknown) as chainAdapters.BuildSendTxInput<ChainTypes.Ethereum>
      await expect(adapter.buildSendTransaction(tx)).resolves.toStrictEqual({
        txToSign: {
          addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
          chainId: 1,
          data: '',
          gasLimit: numberToHex(gasLimit),
          gasPrice: numberToHex(gasPrice),
          nonce: '0x2',
          to: EOA_ADDRESS,
          value: numberToHex(value)
        }
      })
      expect(args.providers.http.getAccount).toHaveBeenCalledTimes(1)
    })
    it('should send max balance with sendMax property in tx', async () => {
      args.providers.http = {
        getInfo: jest.fn().mockResolvedValue(getInfoMockResponse),
        getAccount: jest.fn<any, any>().mockResolvedValue({
          data: {
            balance: '2500000',
            unconfirmedBalance: '0',
            nonce: 2,
            tokens: [
              {
                caip19: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
                balance: '424242',
                type: 'ERC20',
                contract: '0xc770eefad204b5180df6a14ee197d99d808ee52d'
              }
            ]
          }
        })
      } as any

      const adapter = new ethereum.ChainAdapter(args)

      const tx = ({
        wallet: await getWallet(),
        to: EOA_ADDRESS,
        value,
        chainSpecific: chainSpecificWithoutErc20ContractAddress,
        sendMax: true
      } as unknown) as chainAdapters.BuildSendTxInput<ChainTypes.Ethereum>
      await expect(adapter.buildSendTransaction(tx)).resolves.toStrictEqual({
        txToSign: {
          addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
          chainId: 1,
          data: '',
          gasLimit: numberToHex(gasLimit),
          gasPrice: numberToHex(gasPrice),
          nonce: '0x2',
          to: EOA_ADDRESS,
          value: '0xb3b00'
        }
      })
      expect(args.providers.http.getAccount).toHaveBeenCalledTimes(2)
    })
    it("should build a tx with value: '0' for ERC20 txs without sendMax", async () => {
      args.providers.http = {
        getInfo: jest.fn().mockResolvedValue(getInfoMockResponse),
        getAccount: jest.fn<any, any>().mockResolvedValue({
          data: {
            balance: '2500000',
            unconfirmedBalance: '0',
            nonce: 2,
            tokens: [
              {
                caip19: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
                balance: '424242',
                type: 'ERC20',
                contract: '0xc770eefad204b5180df6a14ee197d99d808ee52d'
              }
            ]
          }
        })
      } as any

      const adapter = new ethereum.ChainAdapter(args)

      const tx = ({
        wallet: await getWallet(),
        to: ZERO_ADDRESS,
        value,
        chainSpecific: chainSpecificWithErc20ContractAddress
      } as unknown) as chainAdapters.BuildSendTxInput<ChainTypes.Ethereum>
      await expect(adapter.buildSendTransaction(tx)).resolves.toStrictEqual({
        txToSign: {
          addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
          chainId: 1,
          data:
            '0xa9059cbb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000190',
          gasLimit: numberToHex(gasLimit),
          gasPrice: numberToHex(gasPrice),
          nonce: '0x2',
          to: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
          value: '0x0'
        }
      })
      expect(args.providers.http.getAccount).toHaveBeenCalledTimes(1)
    })
    it('should build a tx with full account balance - gas fee for ERC20 txs with sendMax', async () => {
      args.providers.http = {
        getInfo: jest.fn().mockResolvedValue(getInfoMockResponse),
        getAccount: jest.fn<any, any>().mockResolvedValue({
          data: {
            balance: '2500000',
            unconfirmedBalance: '0',
            nonce: 2,
            tokens: [
              {
                caip19: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
                balance: '424242',
                type: 'ERC20',
                contract: '0xc770eefad204b5180df6a14ee197d99d808ee52d'
              }
            ]
          }
        })
      } as any

      const adapter = new ethereum.ChainAdapter(args)

      const tx = ({
        wallet: await getWallet(),
        to: ZERO_ADDRESS,
        value,
        chainSpecific: chainSpecificWithErc20ContractAddress,
        sendMax: true
      } as unknown) as chainAdapters.BuildSendTxInput<ChainTypes.Ethereum>

      await expect(adapter.buildSendTransaction(tx)).resolves.toStrictEqual({
        txToSign: {
          addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
          chainId: 1,
          data:
            '0xa9059cbb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000067932',
          gasLimit: numberToHex(gasLimit),
          gasPrice: numberToHex(gasPrice),
          nonce: '0x2',
          to: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
          value: '0x0'
        }
      })
      expect(args.providers.http.getAccount).toHaveBeenCalledTimes(2)
    })
  })
})
