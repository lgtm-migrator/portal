import dayjs from 'dayjs'
import {
  QueryAppResponse,
  QueryBalanceResponse,
  RawTxRequest,
} from '@pokt-network/pocket-js'
import { APPLICATION_STATUSES } from '../application-statuses'
import { FREE_TIER_STAKE_AMOUNT, SLOT_STAKE_AMOUNT } from './config'
import Application, { IApplication } from '../models/Application'
import LoadBalancer from '../models/LoadBalancer'
import PreStakedApp from '../models/PreStakedApp'
import User from '../models/User'
import { txLog } from '../lib/logger'
import { influx, APPLICATION_USAGE_QUERY } from '../lib/influx'
import {
  createAppStakeTx,
  createAppUnstakeTx,
  getApp,
  getBalance,
  submitRawTransaction,
  transferFromFreeTierFund,
  transferToFreeTierFund,
} from '../lib/pocket'
import MailgunService from '../services/MailgunService'

async function unstakeApplication(
  app: typeof Application & IApplication,
  ctx
): Promise<void> {
  const { freeTierApplicationAccount } = app
  const { address, passPhrase, privateKey } = freeTierApplicationAccount
  // @ts-ignore
  const decryptedPrivateKey = Application.decryptPrivateKey(privateKey)

  const unstakeTxToSend = await createAppUnstakeTx(
    passPhrase,
    Buffer.from(decryptedPrivateKey, 'hex')
  )
  const txHash = await submitRawTransaction(
    address,
    (unstakeTxToSend as RawTxRequest).txHex
  )

  if (!txHash) {
    ctx.logger.error(
      `UNSTAKE tx was NOT sent for app ${app.name} ${address}! This is an issue with the provider node and pocketJS.`
    )
    return
  }

  app.status = APPLICATION_STATUSES.AWAITING_SLOT_STAKING
  app.updatedAt = new Date(Date.now())
  await app.save()

  ctx.logger.info(
    `unstakeApplication(): submitted UNSTAKE tx ${txHash} for app ${app.name} ${address}`,
    {
      address,
      kind: 'txLog',
      status: APPLICATION_STATUSES.AWAITING_SLOT_STAKING,
      txHash,
      type: 'unstake',
    } as txLog
  )
}

async function stakeApplication(
  app: typeof Application & IApplication,
  ctx
): Promise<void> {
  const { chain, freeTierApplicationAccount } = app
  const { address, passPhrase, privateKey } = freeTierApplicationAccount
  const { balance } = (await getBalance(address)) as QueryBalanceResponse

  if (balance < SLOT_STAKE_AMOUNT) {
    ctx.logger.warn(
      `NOTICE! app ${app.name} [${app.freeTierApplicationAccount.address}] doesn't have enough funds.`
    )
    return
  }

  ctx.logger.info(`Staking app ${app.name} [${address}] for chain ${chain}`)

  // @ts-ignore
  const decryptedPrivateKey = Application.decryptPrivateKey(privateKey)

  const stakeTxToSend = await createAppStakeTx(
    passPhrase,
    Buffer.from(decryptedPrivateKey, 'hex'),
    ['0021'],
    SLOT_STAKE_AMOUNT.toString()
  )
  const txHash = await submitRawTransaction(
    address,
    (stakeTxToSend as RawTxRequest).txHex
  )

  if (!txHash) {
    ctx.logger.warn(`stake tx was not sent for ${app.name} [${address}]`)
    return
  }

  app.status = APPLICATION_STATUSES.AWAITING_FUNDS_REMOVAL
  app.updatedAt = new Date(Date.now())

  await app.save()

  ctx.logger.info(
    `Sent SLOT stake tx for app ${app.name} [${address}]: ${txHash}`,
    {
      address,
      amount: SLOT_STAKE_AMOUNT.toString(),
      kind: 'txLog',
      status: APPLICATION_STATUSES.AWAITING_FUNDS_REMOVAL,
      txHash,
      type: 'stake',
    } as txLog
  )
}

async function removeFunds({
  app,
  ctx,
}: {
  app: typeof Application & IApplication
  ctx: any
}) {
  const { address, privateKey = '' } = app.freeTierApplicationAccount
  // @ts-ignore
  const { balance } = (await getBalance(address)) as QueryBalanceResponse
  const balanceBn = BigInt(balance.toString())

  // @ts-ignore
  const decryptedPrivateKey = Application.decryptPrivateKey(privateKey)

  const txHash = await transferToFreeTierFund({
    amount: balanceBn - 10000n,
    address,
    privateKey: decryptedPrivateKey,
  })

  if (!txHash) {
    ctx.logger.error(
      `removeFunds(): funds transfer tx was NOT sent for app ${app.name} ${address}! This is an issue with the provider node and pocketJS.`
    )
    return
  }

  ctx.logger.info(
    `removeFunds(): app ${app.name} [${address}] transferred funds to free tier wallet in tx ${txHash}`,
    {
      address,
      amount: balanceBn.toString(),
      kind: 'txLog',
      status: 'MOVED_TO_PRESTAKEAPPPOOL',
      txHash,
      type: 'transfer',
    } as txLog
  )

  const preStakedApp = new PreStakedApp({
    chain: app.chain,
    status: APPLICATION_STATUSES.READY,
    createdAt: app.createdAt,
    freeTierApplicationAccount: app.freeTierApplicationAccount,
    gatewayAAT: app.gatewayAAT,
  })

  await preStakedApp.save()
  await Application.deleteOne({ _id: app._id })
}

async function markAppForRemoval({
  app,
  ctx,
}: {
  app: typeof Application & IApplication
  ctx: any
}): Promise<void> {
  // We mark it as ready for removal by assigning this status,
  // which means that there'll be a 24h period where the app's still available
  // before it's finally removed
  app.status = APPLICATION_STATUSES.AWAITING_GRACE_PERIOD
  app.updatedAt = new Date(Date.now())

  const userID = app.user?.toString()

  // We might get apps from a legacy account, which have an email as relationship instead of mongo ObjectID.
  const user = userID.includes('@')
    ? await User.findOne({ email: userID })
    : await User.findById(userID)

  ctx.logger.info(
    `marked ${app.freeTierApplicationAccount.address}-${app.name} for removal`
  )

  const emailService = new MailgunService()

  emailService.send({
    templateData: {
      app_name: app.name,
    },
    templateName: 'Unstake',
    toEmail: user.email,
  })

  await app.save()
}

async function categorizeApp({
  app,
  ctx,
}: {
  app: typeof Application & IApplication
  ctx: any
}) {
  const { address } = app.freeTierApplicationAccount
  // @ts-ignore
  const { staked_tokens: stakedTokens } = (
    await getApp(address)
  ).toJSON() as QueryAppResponse

  // if we can't fetch the balance, it's possible that the app could get "categorized" wrongly,
  // so we bail.
  if (!stakedTokens) {
    ctx.logger.error(
      `could not fetch balance for ${app.name} [${address}]`,
      stakedTokens
    )
    return
  }

  ctx.logger.info(`app ${app.name} [${address}] has ${stakedTokens} in balance`)

  const appLbs = await LoadBalancer.find({
    applicationIDs: app._id.toString(),
  })

  Promise.allSettled(
    appLbs.map(async function removeAppIDFromLb(lb) {
      const { applicationIDs } = lb
      const newAppIDs = applicationIDs.filter((id) => id !== app._id.toString())

      if (newAppIDs.length === 0) {
        await LoadBalancer.deleteOne({ _id: lb._id.toString() })
        return
      }

      lb.applicationIDs = newAppIDs
      await lb.save()
    })
  )

  if (BigInt(stakedTokens) === FREE_TIER_STAKE_AMOUNT) {
    ctx.logger.info(`moving ${app.name} [${address}] to prestake pool`)
    // mark for moving to pre-stake pool
    // @ts-ignore
    await moveToPreStakePool(app, ctx)
    return
  }
  if (BigInt(stakedTokens) !== FREE_TIER_STAKE_AMOUNT) {
    // mark for unstaking
    ctx.logger.info(`marking ${app.name} [${address}] for unstaking`)
    app.status = APPLICATION_STATUSES.AWAITING_SLOT_FUNDS
    app.updatedAt = new Date(Date.now())
    await app.save()
    return
  }
}

async function moveToPreStakePool(
  app: typeof Application & IApplication,
  ctx
): Promise<void> {
  const preStakedApp = new PreStakedApp({
    chain: app.chain,
    status: APPLICATION_STATUSES.SWAPPABLE,
    createdAt: app.createdAt,
    freeTierApplicationAccount: app.freeTierApplicationAccount,
    gatewayAAT: app.gatewayAAT,
  })

  await Application.deleteOne({ _id: app._id })

  await preStakedApp.save()

  ctx.logger.info(
    `app ${app.name} [${app.freeTierApplicationAccount.address}] (chain: ${preStakedApp.chain})moved to PreStakedAppPool`
  )
}

/*
 * In the app removal cycle, apps are first checked for usage and then marked as unused.
 * A warning email is sent to the unused apps and marked for removal.
 * */
export async function markAppsForRemoval(ctx): Promise<void> {
  const appsWithUsage = await influx.collectRows(APPLICATION_USAGE_QUERY)

  const apps = await Application.find()

  const appsWithoutUsage = []

  for (const app of apps) {
    const correspondingApp = appsWithUsage.find(
      ({ applicationPublicKey }) =>
        applicationPublicKey === app.freeTierApplicationAccount.publicKey
    )

    if (!correspondingApp) {
      appsWithoutUsage.push(app)
    }
  }

  Promise.allSettled(
    appsWithoutUsage.map(async function markApp(app) {
      // @ts-ignore
      if (!app.freeTierApplicationAccount.privateKey) {
        ctx.logger.info(
          `app ${app.name} [${app.freeTierApplicationAccountaddress}] doesn't have a private key stored`
        )
        return
      }

      await markAppForRemoval({ app, ctx })
    })
  )

  ctx.logger.info(`decomissioning ${appsWithoutUsage.length} apps`)
}

export async function categorizeAppRemoval(ctx): Promise<void> {
  // We try to process only 10 documents on each run, to not overload our nodes.
  const apps = await Application.find({
    status: APPLICATION_STATUSES.AWAITING_GRACE_PERIOD,
  }).limit(10)

  Promise.allSettled(
    apps.map(async function categorize(app) {
      const updatedAt = dayjs(app.updatedAt)
      const now = dayjs()

      const isGracePeriodOver = now.diff(updatedAt, 'hour') >= 24

      if (!isGracePeriodOver) {
        return
      }

      // @ts-ignore
      await categorizeApp({ app, ctx })
    })
  )
}

export async function transferSlotFunds(ctx): Promise<void> {
  const apps = await Application.find({
    status: APPLICATION_STATUSES.AWAITING_SLOT_FUNDS,
  }).limit(10)

  Promise.allSettled(
    apps.map(async function transferFunds(app) {
      const { address } = app.freeTierApplicationAccount

      const txHash = await transferFromFreeTierFund(
        SLOT_STAKE_AMOUNT.toString(),
        address
      )

      if (!txHash) {
        ctx.logger.error(
          `UNSTAKE tx was NOT sent for app ${app.name} ${address}! This is an issue with the provider node and pocketJS.`
        )
        return
      }

      app.status = APPLICATION_STATUSES.AWAITING_UNSTAKING
      app.updatedAt = new Date(Date.now())

      ctx.logger.info(
        `fillAppPool(): sent funds to account ${address} on tx ${txHash}`,
        {
          address,
          amount: SLOT_STAKE_AMOUNT.toString(),
          kind: 'txLog',
          status: APPLICATION_STATUSES.AWAITING_UNSTAKING,
          txHash,
          type: 'transfer',
        } as txLog
      )
      await app.save()
    })
  )
}

export async function unstakeApps(ctx): Promise<void> {
  const apps = await Application.find({
    status: APPLICATION_STATUSES.AWAITING_UNSTAKING,
  }).limit(10)

  Promise.allSettled(
    apps.map(async function unstake(app) {
      const updatedAt = dayjs(app.updatedAt)
      const now = dayjs()

      // For TX propagation purposes, we wait a bit in between sending an unstake tx and a stake tx.
      // This way they're included in the same (or subsequent) block, and we don't leave the gap open for too long.
      const isGracePeriodOver = now.diff(updatedAt, 'minute') >= 10

      if (!isGracePeriodOver) {
        return
      }

      // @ts-ignore
      await unstakeApplication(app, ctx)
    })
  )
}

export async function stakeAppsForSlots(ctx): Promise<void> {
  const apps = await Application.find({
    status: APPLICATION_STATUSES.AWAITING_SLOT_STAKING,
  }).limit(10)

  Promise.allSettled(
    apps.map(async function unstake(app) {
      const updatedAt = dayjs(app.updatedAt)
      const now = dayjs()

      // For TX propagation purposes, we wait a bit in between sending an unstake tx and a stake tx.
      // This way they're included in the same (or subsequent) block, and we don't leave the gap open for too long.
      const isGracePeriodOver = now.diff(updatedAt, 'minute') >= 5

      if (!isGracePeriodOver) {
        return
      }

      // @ts-ignore
      await stakeApplication(app, ctx)
    })
  )
}

export async function removeFundsFromApps(ctx): Promise<void> {
  const apps = await Application.find({
    status: APPLICATION_STATUSES.AWAITING_FUNDS_REMOVAL,
  }).limit(10)

  Promise.allSettled(
    apps.map(async function removeApp(app) {
      const updatedAt = dayjs(app.updatedAt)
      const now = dayjs()

      const isGracePeriodOver = now.diff(updatedAt, 'day') >= 22

      if (!isGracePeriodOver) {
        return
      }

      // @ts-ignore
      await removeFunds({ app, ctx })
    })
  )
}
