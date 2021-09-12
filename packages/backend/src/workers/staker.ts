import crypto from 'crypto'
import {
  QueryBalanceResponse,
  RawTxRequest,
  StakingStatus,
  typeGuard,
} from '@pokt-network/pocket-js'
import Application from '../models/Application'
import PreStakedApp, { IPreStakedApp } from '../models/PreStakedApp'
import { SLOT_STAKE_AMOUNT } from './config'
import { txLog } from '../lib/logger'
import {
  createAppStakeTx,
  getApplications,
  getBalance,
  getPocketInstance,
  submitRawTransaction,
  TOTAL_APP_SLOTS,
  transferFromFreeTierFund,
} from '../lib/pocket'
import { APPLICATION_STATUSES } from '../application-statuses'
import env, { PocketNetworkKeys } from '../environment'

const { freeTierFundAddress } = env('POCKET_NETWORK') as PocketNetworkKeys

async function createApplicationAndFund({ ctx }: { ctx: any }) {
  const pocket = await getPocketInstance()
  const generatedPassphrase = crypto.randomBytes(32).toString()
  const account = await pocket.keybase.createAccount(generatedPassphrase)

  if (typeGuard(account, Error)) {
    ctx.logger.error(
      `Could not create application. This is an error with pocketJS.`
    )
    return false
  }

  const preStakedApp = new PreStakedApp({
    chain: '0021',
    status: APPLICATION_STATUSES.AWAITING_SLOT_STAKING,
    freeTierApplicationAccount: {
      address: account.address.toString(),
      // @ts-ignore
      privateKey: Application.encryptPrivateKey(
        account.encryptedPrivateKeyHex.toString()
      ),
      publicKey: account.publicKey.toString(),
      passPhrase: generatedPassphrase,
    },
  })

  ctx.logger.info(
    `Created app ${account.address.toString()} with pk ${account.publicKey.toString()}`
  )

  const txHash = await transferFromFreeTierFund(
    (SLOT_STAKE_AMOUNT + 20000n).toString(),
    account.address.toString()
  )

  if (!txHash) {
    ctx.logger.error(
      `Funds were not sent for app ${account.address.toString()}! This is an issue with connecting to the network with PocketJS.`
    )
    return false
  }

  ctx.logger.info(
    `createApplicationAndFund(): sent funds (${SLOT_STAKE_AMOUNT.toString()} POKT) to app ${account.address.toString()} on tx ${txHash}`,
    {
      workerName: ctx.name,
      account: account.address.toString(),
      amount: SLOT_STAKE_AMOUNT.toString(),
      chain: '0021',
      status: APPLICATION_STATUSES.AWAITING_SLOT_STAKING,
      txHash,
      type: 'transfer',
      kind: 'txLog',
    } as txLog
  )
  await preStakedApp.save()

  return true
}

async function fillAppSlot({
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

  if (balance < SLOT_STAKE_AMOUNT) {
    ctx.logger.warn(
      `NOTICE! app ${app.freeTierApplicationAccount.address} doesn't have enough funds.`
    )
    return
  }

  ctx.logger.info(`Filling up slot with app ${address}`)

  // @ts-ignore
  const decryptedPrivateKey = Application.decryptPrivateKey(privateKey)

  const stakeTxToSend = await createAppStakeTx(
    passPhrase,
    Buffer.from(decryptedPrivateKey, 'hex'),
    [chain],
    SLOT_STAKE_AMOUNT.toString()
  )
  const txHash = await submitRawTransaction(
    address,
    (stakeTxToSend as RawTxRequest).txHex
  )

  app.status = APPLICATION_STATUSES.READY
  app.stakingTxHash = txHash
  app.chain = chain
  await app.save()

  ctx.logger.info(
    `stakeAppSlots(): Sent slot stake request for filling on tx ${txHash} : app ${address}, chain ${chain}`,
    {
      workerName: ctx.name,
      account: address,
      amount: SLOT_STAKE_AMOUNT.toString(),
      chain,
      status: APPLICATION_STATUSES.READY,
      txHash,
      type: 'slot_stake',
      kind: 'txLog',
    } as txLog
  )

  return true
}

/*
 * Creates new accounts and transfers funds to them,
 * to then fill the remaining slots.
 * */
export async function createAppForSlots(ctx): Promise<void> {
  const stakedApps = (await getApplications(StakingStatus.Staked)).applications
    .length
  const { balance } = (await getBalance(
    freeTierFundAddress
  )) as QueryBalanceResponse

  const slotsToFill = Math.max(0, TOTAL_APP_SLOTS - stakedApps)

  if (slotsToFill === 0) {
    ctx.logger.info('createAppForSlots(): no slots to fill.')
  }

  if (balance < BigInt(slotsToFill)) {
    ctx.logger.warn(
      `createAppForSlots(): Free tier fund wallet has run out of balance`
    )
    return
  }

  ctx.logger.info(
    `createAppForSlots(): filling ${slotsToFill.toString()} slots.`
  )

  for (let i = 0; i < slotsToFill; i++) {
    await createApplicationAndFund({ ctx })
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function stakeAppSlots(ctx): Promise<void> {
  const appPool = await PreStakedApp.find({
    status: APPLICATION_STATUSES.AWAITING_SLOT_STAKING,
  })

  await Promise.allSettled(
    appPool.map(async (app) => {
      await fillAppSlot({ ctx, app, chain: '0021' })
    })
  )
}
