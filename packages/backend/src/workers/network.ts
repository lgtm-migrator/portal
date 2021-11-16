/* global BigInt */
import { QueryAppsResponse, StakingStatus } from '@pokt-network/pocket-js'
import NetworkData from '../models/NetworkData'
import Blockchains, { IChain } from '../models/Blockchains'
import { getNodes, getApplications } from '../lib/pocket'

async function getTotalNodesStaked() {
  const stakedNodes = await getNodes(StakingStatus.Staked)

  if (!stakedNodes || stakedNodes?.length === 0) {
    throw new Error('PocketJS failed to retrieve staked nodes')
  }
  return stakedNodes.length
}

async function getTotalAppsStaked() {
  const stakedApps = await getApplications(StakingStatus.Staked)

  if (!stakedApps || stakedApps?.applications.length === 0) {
    throw new Error('PocketJS failed to retrieve staked apps')
  }

  return stakedApps.applications.length
}

async function getAppCountPerChain() {
  const apps = (await getApplications(
    StakingStatus.Staked
  )) as QueryAppsResponse
  const appPerChain = new Map()

  for (const app of apps.applications) {
    for (const chain of app.chains) {
      if (appPerChain.has(chain)) {
        appPerChain.set(chain, appPerChain.get(chain) + 1)
      } else {
        appPerChain.set(chain, 1)
      }
    }
  }

  return appPerChain
}

async function getTotalPoktStaked() {
  const stakedNodes = await getNodes(StakingStatus.Staked)
  const stakedApps = await getApplications(StakingStatus.Staked)
  const totalNodePoktStaked = stakedNodes.reduce(
    (prev, cur) => prev + BigInt(cur.stakedTokens),
    0n
  )
  const totalAppPoktStaked = stakedApps.reduce(
    (prev, cur) => prev + BigInt(cur.stakedTokens),
    0n
  )

  return BigInt(totalNodePoktStaked + totalAppPoktStaked)
}

export async function getNetworkStatsCount(ctx): Promise<void> {
  const totalAppsStaked = await getTotalAppsStaked()
  const totalPoktStaked = await getTotalPoktStaked()
  const networkStats = new NetworkData({
    nodesStaked: 5400,
    appsStaked: totalAppsStaked,
    poktStaked: totalPoktStaked.toString(),
    createdAt: new Date(Date.now()),
  })

  await networkStats.save()
}

export async function getAppsPerChain(ctx): Promise<void> {
  const appsPerChain = await getAppCountPerChain()

  for (const [chainID, count] of appsPerChain) {
    const blockchain: IChain = await Blockchains.findById(chainID)

    if (!blockchain) {
      ctx.logger.warn(
        `[${ctx.name}] NOTICE: chain ${chainID} not detected, count of apps is ${count}`
      )
      return
    }

    blockchain.appCount = count

    await blockchain.save()
  }
}

export async function getNodeCountForChains(ctx): Promise<void> {
  const chainNodeCounter = new Map()
  const stakedNodes = await getNodes(StakingStatus.Staked)

  if (!stakedNodes) {
    throw new Error('pocketJS failed when fetching nodes')
  }

  for (const { chains } of stakedNodes) {
    for (const chainId of chains) {
      if (!chainNodeCounter.has(chainId)) {
        chainNodeCounter.set(chainId, 0)
      } else {
        const currentCount = Number(chainNodeCounter.get(chainId))

        chainNodeCounter.set(chainId, currentCount + 1)
      }
    }
  }

  chainNodeCounter.forEach(async function updateChainCount(count, id) {
    const blockchain: IChain = await Blockchains.findById(id)

    if (!blockchain) {
      ctx.logger.warn(
        `[${ctx.name}] NOTICE: chain ${id} not detected, count of nodes is ${count}`
      )
      return
    }

    blockchain.nodeCount = count

    await blockchain.save()
  })
}
