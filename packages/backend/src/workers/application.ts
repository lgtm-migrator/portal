import { QueryBalanceResponse, RawTxRequest } from '@pokt-network/pocket-js'
import Application from '../models/Application'
import PreStakedApp, { IPreStakedApp } from '../models/PreStakedApp'
import { chains, FREE_TIER_STAKE_AMOUNT } from './config'
import { txLog } from '../lib/logger'
import {
  createAppStakeTx,
  getBalance,
  submitRawTransaction,
  transferFromFreeTierFund,
} from '../lib/pocket'
import { APPLICATION_STATUSES } from '../application-statuses'
import env from '../environment'

const freeTierAccountAddress = env('FREE_TIER_ACCOUNT_ADDRESS') as string

async function getApplicationAndFund({
  chain,
  ctx,
}: {
  chain: string
  ctx: any
}) {
  const app = await PreStakedApp.findOne({ status: APPLICATION_STATUSES.READY })
  const { address } = app.freeTierApplicationAccount
  const { balance } = (await getBalance(address)) as QueryBalanceResponse

  if (balance >= FREE_TIER_STAKE_AMOUNT) {
    ctx.logger.warn(`[${ctx.name}]: app ${address} already had enough balance`)
    app.status = APPLICATION_STATUSES.AWAITING_FREETIER_STAKING
    app.chain = chain
    await app.save()
    return false
  }

  const txHash = await transferFromFreeTierFund(
    FREE_TIER_STAKE_AMOUNT.toString(),
    address
  )

  if (!txHash) {
    ctx.logger.error(
      `[${ctx.name}] Funds were not sent for app ${app.freeTierApplicationAccount.address}! This is an issue with connecting to the network with PocketJS.`
    )
    return false
  }

  app.status = APPLICATION_STATUSES.AWAITING_FREETIER_STAKING
  app.fundingTxHash = txHash
  app.chain = chain

  ctx.logger.info(
    `[${
      ctx.name
    }] sent funds (${FREE_TIER_STAKE_AMOUNT.toString()} POKT) to app ${address} on tx ${txHash}`,
    {
      workerName: ctx.name,
      account: address,
      amount: FREE_TIER_STAKE_AMOUNT.toString(),
      chain,
      status: APPLICATION_STATUSES.AWAITING_FREETIER_STAKING,
      txHash,
      type: 'transfer',
      kind: 'txLog',
    } as txLog
  )
  await app.save()
  return true
}

async function stakeApplication({
  app,
  ctx,
}: {
  app: IPreStakedApp
  chain: string
  ctx: any
}): Promise<boolean> {
  const { chain, freeTierApplicationAccount } = app
  const { address, passPhrase, privateKey } = freeTierApplicationAccount
  const { balance } = (await getBalance(address)) as QueryBalanceResponse

  if (balance < FREE_TIER_STAKE_AMOUNT) {
    ctx.logger.warn(
      `[${ctx.name}] app ${app.freeTierApplicationAccount.address} doesn't have enough funds.`
    )
    return
  }

  ctx.logger.info(`[${ctx.name}] Staking app ${address} for chain ${chain}`)

  // @ts-ignore
  const decryptedPrivateKey = Application.decryptPrivateKey(privateKey)

  const stakeTxToSend = await createAppStakeTx(
    passPhrase,
    Buffer.from(decryptedPrivateKey, 'hex'),
    [chain],
    FREE_TIER_STAKE_AMOUNT.toString()
  )
  const txHash = await submitRawTransaction(
    address,
    (stakeTxToSend as RawTxRequest).txHex
  )

  app.status = APPLICATION_STATUSES.SWAPPABLE
  app.stakingTxHash = txHash
  app.chain = chain
  await app.save()

  ctx.logger.info(
    `[${ctx.name}] Sent stake request on tx ${txHash} : app ${address}, chain ${chain}`,
    {
      workerName: ctx.name,
      account: address,
      amount: FREE_TIER_STAKE_AMOUNT.toString(),
      chain,
      status: APPLICATION_STATUSES.SWAPPABLE,
      txHash,
      type: 'stake',
      kind: 'txLog',
    } as txLog
  )

  return true
}

export async function fillAppPool(ctx): Promise<void> {
  const { balance } = (await getBalance(
    freeTierAccountAddress
  )) as QueryBalanceResponse

  if (balance < FREE_TIER_STAKE_AMOUNT) {
    ctx.logger.error(
      `[${ctx.name}] Free tier fund wallet has run out of balance`
    )
    return
  }

  const appPool = await PreStakedApp.find({
    $or: [
      { status: APPLICATION_STATUSES.SWAPPABLE },
      { status: APPLICATION_STATUSES.AWAITING_FREETIER_STAKING },
    ],
  })

  for (const [, { id, limit }] of Object.entries(chains)) {
    const availableApps = appPool.filter((app) => app?.chain === id)

    if (availableApps.length < limit) {
      const slotsToFill = limit - availableApps.length

      ctx.logger.info(
        `[${ctx.name}] Filling ${slotsToFill} (out of ${limit}) slots for chain ${id}`,
        {
          workerName: ctx.name,
          chain: id,
          kind: 'txLog',
        }
      )

      for (let i = 0; i < slotsToFill; i++) {
        await getApplicationAndFund({ chain: id, ctx })
      }
    }
  }
}

export async function stakeAppPool(ctx): Promise<void> {
  const appPool = await PreStakedApp.find({
    status: APPLICATION_STATUSES.AWAITING_FREETIER_STAKING,
  })

  await Promise.allSettled(
    appPool.map(async (app) => {
      await stakeApplication({ ctx, app, chain: app.chain })
    })
  )
}
