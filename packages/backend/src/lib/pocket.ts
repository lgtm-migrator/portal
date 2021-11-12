/* global BigInt */
import {
  Configuration,
  HttpRpcProvider,
  ITransactionSender,
  Node,
  Pocket,
  PocketRpcProvider,
  QueryAccountResponse,
  QueryAppResponse,
  QueryAppsResponse,
  QueryBalanceResponse,
  QueryTXResponse,
  RawTxRequest,
  RpcError,
  UnlockedAccount,
  typeGuard,
} from '@pokt-network/pocket-js'
import env, { PocketNetworkKeys } from '../environment'

const { blockTime, chainId, transactionFee } = env(
  'POCKET_NETWORK'
) as PocketNetworkKeys
const freeTierAccountAddress = env('FREE_TIER_ACCOUNT_ADDRESS') as string
const freeTierAccountPrivateKey = env('FREE_TIER_ACCOUNT_PRIVATE_KEY') as string

const DEFAULT_DISPATCHER_LIST =
  'https://dispatch-1.nodes.pokt.network:4201,https://dispatch-2.nodes.pokt.network:4202,https://dispatch-3.nodes.pokt.network:4203,https://dispatch-4.nodes.pokt.network:4204,https://dispatch-5.nodes.pokt.network:4205,https://dispatch-6.nodes.pokt.network:4206,https://dispatch-7.nodes.pokt.network:4207,https://dispatch-8.nodes.pokt.network:4208,https://dispatch-9.nodes.pokt.network:4209,https://dispatch-10.nodes.pokt.network:4210,https://dispatch-11.nodes.pokt.network:4211,https://dispatch-12.nodes.pokt.network:4212,https://dispatch-13.nodes.pokt.network:4213,https://dispatch-14.nodes.pokt.network:4214,https://dispatch-15.nodes.pokt.network:4215,https://dispatch-16.nodes.pokt.network:4216,https://dispatch-17.nodes.pokt.network:4217,https://dispatch-18.nodes.pokt.network:4218,https://dispatch-19.nodes.pokt.network:4219,https://dispatch-20.nodes.pokt.network:4220'
    .split(',')
    .map((uri) => new URL(uri))
const DEFAULT_HTTP_PROVIDER_NODE = 'https://peer-1.nodes.pokt.network:4200/'
const DEFAULT_MAX_DISPATCHERS = 20
const DEFAULT_MAX_SESSIONS = 1000000
const DEFAULT_MAX_SESSION_RETRIES = 1
const DEFAULT_REQUEST_TIMEOUT = 60 * 1000

const POCKET_CONFIGURATION = new Configuration(
  DEFAULT_MAX_DISPATCHERS,
  DEFAULT_MAX_SESSIONS,
  0,
  DEFAULT_REQUEST_TIMEOUT,
  false,
  undefined,
  Number(blockTime),
  DEFAULT_MAX_SESSION_RETRIES,
  false,
  false,
  false
)

export const POKT_DENOMINATIONS = {
  pokt: 0,
  upokt: 6,
}

export const TOTAL_APP_SLOTS = 2000

function getPocketDispatchers() {
  return DEFAULT_DISPATCHER_LIST
}

function getRPCProvider(): HttpRpcProvider | PocketRpcProvider {
  return new HttpRpcProvider(new URL(DEFAULT_HTTP_PROVIDER_NODE))
}

export async function getNodes(status: number): Promise<Node[]> {
  let page = 1
  const nodeList = []
  const perPage = 100
  const pocketRpcProvider = getRPCProvider()
  const pocketInstance = new Pocket(
    getPocketDispatchers(),
    undefined,
    POCKET_CONFIGURATION
  )
  const nodesResponse = await pocketInstance
    .rpc(pocketRpcProvider)
    .query.getNodes(status, undefined, BigInt(0), undefined, page, perPage)

  if (nodesResponse instanceof RpcError) {
    return []
  }
  const totalPages = nodesResponse.totalPages

  nodesResponse.nodes.forEach((node) => {
    nodeList.push(node)
  })
  page++
  while (page <= totalPages) {
    const response = await pocketInstance
      .rpc(pocketRpcProvider)
      .query.getNodes(status, undefined, BigInt(0), undefined, page, perPage)

    // Increment page variable
    page++
    if (response instanceof RpcError) {
      page = totalPages
      return
    }
    response.nodes.forEach((node) => {
      nodeList.push(node)
    })
  }
  return nodesResponse.nodes
}

export async function getApplications(status = 2): Promise<QueryAppsResponse> {
  const page = 1
  const perPage = 3000

  const pocketRpcProvider = getRPCProvider()
  const pocketInstance = new Pocket(
    getPocketDispatchers(),
    undefined,
    POCKET_CONFIGURATION
  )

  const applicationsResponse = (await pocketInstance
    .rpc(pocketRpcProvider)
    .query.getApps(status, BigInt(0), '', page, perPage)) as QueryAppsResponse

  return applicationsResponse
}

export async function transferToFreeTierFund({
  amount,
  privateKey,
  address,
}: {
  amount: bigint
  privateKey: string
  address: string
}): Promise<string> {
  if (!amount) {
    throw new Error("Can't transfer to free tier fund: no amount provided")
  }

  const pocketInstance = new Pocket(
    getPocketDispatchers(),
    undefined,
    POCKET_CONFIGURATION
  )
  const pocketRpcProvider = getRPCProvider()

  pocketInstance.rpc(pocketRpcProvider)

  const rawTxResponse = await (
    pocketInstance.withPrivateKey(privateKey) as ITransactionSender
  )
    .send(address, freeTierAccountAddress, amount.toString())
    .submit(chainId, transactionFee)

  if (typeGuard(rawTxResponse, RpcError)) {
    throw new Error(rawTxResponse.message)
  }
  return rawTxResponse.hash
}

export async function transferFromFreeTierFund(
  amount: string,
  customerAddress: string
): Promise<string> {
  if (!transactionFee) {
    throw new Error("Can't transfer from free tier: transaction fee missing")
  }
  if (!chainId) {
    throw new Error("Can't transfer from free tier: chainID missing")
  }
  if (!amount) {
    throw new Error("Can't transfer from free tier: no amount provided")
  }
  if (!customerAddress) {
    throw new Error(
      "Can't transfer from free tier: no customer address provided"
    )
  }
  const totalAmount = BigInt(Number(amount) + Number(transactionFee))

  if (!totalAmount) {
    throw "Can't transfer from free tier: failed to calculate totalAmount"
  }
  const pocketInstance = new Pocket(
    getPocketDispatchers(),
    undefined,
    POCKET_CONFIGURATION
  )
  const pocketRpcProvider = getRPCProvider()

  pocketInstance.rpc(pocketRpcProvider)
  const rawTxResponse = await (
    pocketInstance.withPrivateKey(
      freeTierAccountPrivateKey
    ) as ITransactionSender
  )
    .send(freeTierAccountAddress, customerAddress, totalAmount.toString())
    .submit(chainId, transactionFee)

  if (typeGuard(rawTxResponse, RpcError)) {
    throw new Error(rawTxResponse.message)
  }
  return rawTxResponse.hash
}

export async function createUnlockedAccount(
  passphrase: string
): Promise<UnlockedAccount> {
  const pocketInstance = new Pocket(
    getPocketDispatchers(),
    undefined,
    POCKET_CONFIGURATION
  )
  const account = await pocketInstance.keybase.createAccount(passphrase)
  const unlockedAccountOrError =
    await pocketInstance.keybase.getUnlockedAccount(
      (account as UnlockedAccount & Error).addressHex,
      passphrase
    )

  if (typeGuard(unlockedAccountOrError, Error)) {
    throw new Error(unlockedAccountOrError.message)
  } else if (typeGuard(unlockedAccountOrError, UnlockedAccount)) {
    return unlockedAccountOrError
  } else {
    throw new Error('Unknown error while creating an unlocked account')
  }
}

export async function getBalance(
  addressHex: string
): Promise<QueryBalanceResponse | RpcError> {
  const pocketInstance = new Pocket(
    getPocketDispatchers(),
    undefined,
    POCKET_CONFIGURATION
  )
  const pocketRpcProvider = getRPCProvider()
  const applicationResponse = await pocketInstance
    .rpc(pocketRpcProvider)
    .query.getBalance(addressHex)

  return applicationResponse
}

export async function getTX(
  addressHex: string
): Promise<Error | QueryTXResponse> {
  const pocketInstance = new Pocket(
    getPocketDispatchers(),
    undefined,
    POCKET_CONFIGURATION
  )
  const pocketRpcProvider = getRPCProvider()
  const applicationResponse = await pocketInstance
    .rpc(pocketRpcProvider)
    .query.getTX(addressHex)

  return applicationResponse
}

export async function getAccount(
  addressHex: string
): Promise<RpcError | QueryAccountResponse> {
  const pocketInstance = new Pocket(
    getPocketDispatchers(),
    undefined,
    POCKET_CONFIGURATION
  )
  const pocketRpcProvider = getRPCProvider()
  const applicationResponse = await pocketInstance
    .rpc(pocketRpcProvider)
    .query.getAccount(addressHex)

  return applicationResponse
}

export async function getApp(
  addressHex: string
): Promise<RpcError | QueryAppResponse> {
  const pocketInstance = new Pocket(
    getPocketDispatchers(),
    undefined,
    POCKET_CONFIGURATION
  )
  const pocketRpcProvider = getRPCProvider()
  const applicationResponse = await pocketInstance
    .rpc(pocketRpcProvider)
    .query.getApp(addressHex)

  return applicationResponse
}

export async function createAppStakeTx(
  passphrase: string,
  privateKey: Buffer,
  chains: string[],
  stakeAmount: string
): Promise<RpcError | RawTxRequest> {
  const pocketInstance = new Pocket(
    getPocketDispatchers(),
    undefined,
    POCKET_CONFIGURATION
  )
  const unlockedAccount = await pocketInstance.keybase.importAccount(
    privateKey,
    passphrase
  )

  if (unlockedAccount instanceof Error) {
    throw unlockedAccount
  }
  const senderAccount = await pocketInstance.withImportedAccount(
    unlockedAccount.addressHex,
    passphrase
  )

  // @ts-ignore
  const { unlockedAccount: account } = senderAccount

  return await (senderAccount as ITransactionSender)
    .appStake(account.publicKey.toString('hex'), chains, stakeAmount.toString())
    .createTransaction(chainId, transactionFee)
}

export async function createAppUnstakeTx(
  passphrase: string,
  privateKey: Buffer
): Promise<RpcError | RawTxRequest> {
  const pocketInstance = new Pocket(
    getPocketDispatchers(),
    undefined,
    POCKET_CONFIGURATION
  )
  const unlockedAccount = await pocketInstance.keybase.importAccount(
    privateKey,
    passphrase
  )

  if (unlockedAccount instanceof Error) {
    throw unlockedAccount
  }
  const senderAccount = (await pocketInstance.withImportedAccount(
    unlockedAccount.addressHex,
    passphrase
  )) as ITransactionSender

  return await (senderAccount as ITransactionSender)
    .appUnstake(unlockedAccount.addressHex)
    .createTransaction(chainId, transactionFee)
}

export async function getPocketInstance(): Promise<Pocket> {
  return new Pocket(getPocketDispatchers(), undefined, POCKET_CONFIGURATION)
}

export async function submitRawTransaction(
  fromAddress: string,
  rawTxBytes: string
): Promise<string> {
  const pocketInstance = new Pocket(
    getPocketDispatchers(),
    undefined,
    POCKET_CONFIGURATION
  )
  const pocketRpcProvider = getRPCProvider()
  const rawTxResponse = await pocketInstance
    .rpc(pocketRpcProvider)
    .client.rawtx(fromAddress, rawTxBytes)

  if (typeGuard(rawTxResponse, RpcError)) {
    throw new Error(rawTxResponse.message)
  }
  return rawTxResponse.hash
}
