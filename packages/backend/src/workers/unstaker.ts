import dayjs from 'dayjs'
import {
  QueryAppResponse,
  QueryBalanceResponse,
  RawTxRequest,
} from '@pokt-network/pocket-js'
import { APPLICATION_STATUSES } from '../application-statuses'
import { FREE_TIER_STAKE_AMOUNT, SLOT_STAKE_AMOUNT } from './config'
import Application, { IApplication } from '../models/Application'
import LoadBalancer, { ILoadBalancer } from '../models/LoadBalancer'
import PreStakedApp from '../models/PreStakedApp'
import User from '../models/User'
import { txLog } from '../lib/logger'
import { influx, buildNotificationsQuery } from '../lib/influx'
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
import env from '../environment'
import { composeDaysFromNowUtcDate } from '../lib/date-utils'

const CUSTOM_LB_THRESHOLD = 3

const freeTierAccountAddress = env('FREE_TIER_ACCOUNT_ADDRESS') as string

export async function fetchUsedApps(): Promise<string[]> {
  const rawAppsUsed = await influx.collectRows(
    buildNotificationsQuery({
      start: composeDaysFromNowUtcDate(15),
      stop: composeDaysFromNowUtcDate(0),
    })
  )

  const appsUsed = new Map<string, number>()

  rawAppsUsed.map(({ _value, applicationPublicKey }) => {
    const total = appsUsed.get(applicationPublicKey) ?? 0

    appsUsed.set(applicationPublicKey, total + _value)
  })

  return Array.from(appsUsed.keys())
}

export async function mapAppsToLBs(
  appsUsed: string[],
  ctx: any
): Promise<{
  usedLBs: Map<string, string[]>
  usedLBNames: Map<string, string>
  usedOrphanedApps: Map<string, string>
}> {
  const usedLBs = new Map<string, string[]>()
  const usedLBNames = new Map<string, string>()
  const usedOrphanedApps = new Map<string, string>()

  await Promise.allSettled(
    appsUsed.map(async (publicKey) => {
      // do stuff
      const app = await Application.findOne({
        'freeTierApplicationAccount.publicKey': `${publicKey}`,
      })

      if (!app) {
        ctx.logger.warn(
          `[${ctx.name}] Did not find corresponding app for ${publicKey}`
        )
        return
      }

      const lbs = await LoadBalancer.find({
        applicationIDs: `${app?.id.toString()}`,
      })

      if (!lbs.length) {
        ctx.logger.warn(
          `[${ctx.name}] ${
            app.name
          } (${app._id.toString()}) is an orphaned app and displays usage.`
        )
        usedOrphanedApps.set(app._id.toString(), app.name)
        return
      }

      lbs.map((lb) => {
        // bail if we already have this LB
        if (usedLBs.has(lb.id.toString())) {
          return
        }

        usedLBs.set(lb._id.toString(), lb.applicationIDs)
        usedLBNames.set(lb._id.toString(), lb.name)
      })
    })
  )

  return { usedLBs, usedLBNames, usedOrphanedApps }
}

export async function findUnusedLBs({
  usedLBs,
  usedLBNames,
  usedOrphanedApps,
  ctx,
}: {
  usedLBs: Map<string, string[]>
  usedLBNames: Map<string, string>
  usedOrphanedApps: Map<string, string>
  ctx: any
}): Promise<void> {
  const unusedLBs = new Map<string, string[]>()
  const unusedLBNames = new Map<string, string>()
  // We're taking a "is this element in the set" approach, so we'll need to look at all the LBs and see which are not active.
  const lbs = await LoadBalancer.find()

  await Promise.allSettled(
    lbs.map(async (lb) => {
      // A note on LB removal eligibility:
      // We need to ensure that only old, dusty, "vanilla" LBs are removed.
      // This means that we need to take into account more things than just usage to avoid any edge cases.
      // These are:
      // Is the LB possibly a custom sales LB that has gone unused for whatever reason? If so, dismiss it. We're hunting the small ones only.
      // We'll take only LBs with 3 apps and below to avoid "bigger" endpoints to be reduced in size if they don't hit their full capacity.
      const isLbCustom = lb.applicationIDs.length > CUSTOM_LB_THRESHOLD

      // if it was created or updated recently, dismiss it
      const isLBNew = Math.abs(dayjs().diff(dayjs(lb.createdAt), 'day')) <= 14
      const isLBActive =
        Math.abs(dayjs().diff(dayjs(lb?.updatedAt ?? dayjs()), 'day')) <= 14

      if (
        !usedLBs.has(lb._id.toString()) &&
        !isLbCustom &&
        !isLBNew &&
        !isLBActive
      ) {
        unusedLBs.set(lb._id.toString(), lb.applicationIDs)
        unusedLBNames.set(lb._id.toString(), lb.name)
      } else {
        ctx.logger.info(
          `[${ctx.name}] ${
            lb.name
          } (${lb._id.toString()}) is not eligible for sweeping.`
        )
      }
    })
  )

  // Let's handle apps 10 at a time to not hammer the DB
  const unusedAppIDs = [...Array.from(unusedLBs.values()).flat()]

  await Promise.allSettled(
    unusedAppIDs.map(async (appID) => {
      // do stuff
      const app = await Application.findOne({ _id: appID })

      if (!app) {
        return
      }

      const onChainApp = (await getApp(
        app.freeTierApplicationAccount.address
      )) as QueryAppResponse

      const { staked_tokens } = onChainApp.toJSON()

      // Bail, we're looking for apps we can inmediately move to the prestakepool
      if (BigInt(staked_tokens) !== FREE_TIER_STAKE_AMOUNT) {
        ctx.logger.info(
          `[${ctx.name}] ${
            app.name
          } [${app._id.toString()}] doesn't have the required balance to be moved to the Prestakepool. (current balance: ${staked_tokens})`
        )
        return
      }

      ctx.logger.info(
        `[${ctx.name}] Moving ${
          app.name
        } [${app._id.toString()}] to the Prestakepool`
      )

      const preStakedApp = new PreStakedApp({
        chain: app.chain,
        status: APPLICATION_STATUSES.SWAPPABLE,
        createdAt: app.createdAt,
        freeTierApplicationAccount: app.freeTierApplicationAccount,
        gatewayAAT: app.gatewayAAT,
      })

      const deletedAppID = app._id.toString()

      await Application.deleteOne({ _id: app._id })

      await preStakedApp.save()

      ctx.logger.info(
        `[${ctx.name}] app ${app.name} [${app.freeTierApplicationAccount.address}] (chain: ${preStakedApp.chain})moved to PreStakedAppPool`,
        {
          workerName: ctx.name,
          account: app.freeTierApplicationAccount.address,
          chain: app.chain,
          type: 'removal',
          status: APPLICATION_STATUSES.SWAPPABLE,
        } as txLog
      )

      const LBs = LoadBalancer.find({
        applicationIDs: deletedAppID,
      })

      // Remove this app entry from ANY load balancer it was in.
      // If the load balancer is empty after removing this entry,
      // then delete the whole load balancer.
      LBs.map(async (lb: ILoadBalancer) => {
        const applicationIDs = lb.applicationIDs
        const newApplicationIDs = applicationIDs.filter(
          (id) => id !== deletedAppID.toString()
        )

        if (!newApplicationIDs.length) {
          ctx.logger.info(
            `[${ctx.name}] Removed LB ${lb.name} [${lb._id.toString()}].`
          )
          await lb.deleteOne()
          return
        }

        lb.applicationIDs = newApplicationIDs
        await lb.save()
      })
    })
  )
}

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
      `[${ctx.name}] UNSTAKE tx was NOT sent for app ${app.name} ${address}! This is an issue with the provider node and pocketJS.`
    )
    return
  }

  app.status = APPLICATION_STATUSES.AWAITING_SLOT_STAKING
  app.updatedAt = new Date(Date.now())
  await app.save()

  ctx.logger.info(
    `[${ctx.name}] submitted UNSTAKE tx ${txHash} for app ${app.name} ${address}`,
    {
      workerName: ctx.name,
      account: address,
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
      `[${ctx.name}] app ${app.name} [${app.freeTierApplicationAccount.address}] doesn't have enough funds.`
    )
    return
  }

  ctx.logger.info(
    `[${ctx.name}] Staking app ${app.name} [${address}] for chain ${chain}`,
    {
      workerName: ctx.name,
      account: address,
      kind: 'txLog',
      type: 'log',
    }
  )

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
    ctx.logger.warn(
      `[${ctx.name}] stake tx was not sent for ${app.name} [${address}]. This is an issue with pocketJS connecting to the dispatcher nodes`,
      {
        workerName: ctx.name,
        account: address,
        kind: 'txLog',
        type: 'tx_issue',
      }
    )
    return
  }

  app.status = APPLICATION_STATUSES.AWAITING_FUNDS_REMOVAL
  app.updatedAt = new Date(Date.now())

  await app.save()

  ctx.logger.info(
    `[${ctx.name}] Sent SLOT stake tx for app ${app.name} [${address}]: ${txHash}`,
    {
      workerName: ctx.name,
      account: address,
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
    privateKey: decryptedPrivateKey,
    address,
  })

  if (!txHash) {
    ctx.logger.error(
      `[${ctx.name}] funds transfer tx was NOT sent for app ${app.name} ${address}! This is an issue with the provider node and pocketJS.`,
      {
        workerName: ctx.name,
        account: address,
        kind: 'txLog',
        type: 'tx_issue',
      }
    )
    return
  }

  ctx.logger.info(
    `[${ctx.name}] app ${app.name} [${address}] transferred funds to free tier wallet in tx ${txHash} and it is now back in the PreStakedAppPool available for edit staking.`,
    {
      workerName: ctx.name,
      account: address,
      amount: balanceBn.toString(),
      kind: 'txLog',
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
    `[${ctx.name}] marked ${app.freeTierApplicationAccount.address}-${app.name} for removal`,
    {
      workerName: ctx.name,
      account: app.freeTierApplicationAccount.address,
      kind: 'txLog',
      type: 'mark_for_removal',
    }
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
      `[${ctx.name}] could not fetch balance for ${app.name} [${address}]`,
      stakedTokens
    )
    return
  }

  ctx.logger.info(
    `[${ctx.name}] app ${app.name} [${address}] has ${stakedTokens} in balance`
  )

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
    ctx.logger.info(
      `[${ctx.name}] moving ${app.name} [${address}] to prestake pool`
    )
    // mark for moving to pre-stake pool
    // @ts-ignore
    await moveToPreStakePool(app, ctx)
    return
  }
  if (BigInt(stakedTokens) !== FREE_TIER_STAKE_AMOUNT) {
    // mark for unstaking
    ctx.logger.info(
      `[${ctx.name}] marking ${app.name} [${address}] for unstaking`,
      {
        workerName: ctx.name,
        account: address,
        kind: 'txLog',
        type: 'queue_for_removal',
      }
    )
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
    `[${ctx.name}] app ${app.name} [${app.freeTierApplicationAccount.address}] (chain: ${preStakedApp.chain})moved to PreStakedAppPool`,
    {
      workerName: ctx.name,
      account: app.freeTierApplicationAccount.address,
      chain: app.chain,
      type: 'removal',
      status: APPLICATION_STATUSES.SWAPPABLE,
    } as txLog
  )
}

/*
 * In the app removal cycle, apps are first checked for usage and then marked as unused.
 * A warning email is sent to the unused apps and marked for removal.
 * */
export async function markAppsForRemoval(ctx): Promise<void> {
  const appsWithUsage = await influx.collectRows(
    buildNotificationsQuery({
      start: composeDaysFromNowUtcDate(14),
      stop: composeDaysFromNowUtcDate(0),
    })
  )

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
          `[${ctx.name}] app ${app.name} [${app.freeTierApplicationAccountaddress}] doesn't have a private key stored`
        )
        return
      }

      await markAppForRemoval({ app, ctx })
    })
  )

  ctx.logger.info(
    `[${ctx.name}] found ${appsWithoutUsage.length} apps without usage`
  )
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
  const { balance } = (await getBalance(
    freeTierAccountAddress
  )) as QueryBalanceResponse

  if (balance < FREE_TIER_STAKE_AMOUNT) {
    ctx.logger.warn(
      `[${ctx.name}] Free tier fund wallet has run out of balance`
    )
    return
  }

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
          `[${ctx.name}] UNSTAKE tx was NOT sent for app ${app.name} ${address}! This is an issue with the provider node and pocketJS.`
        )
        return
      }

      app.status = APPLICATION_STATUSES.AWAITING_UNSTAKING
      app.updatedAt = new Date(Date.now())

      ctx.logger.info(
        `[${ctx.name}] sent funds to account ${address} on tx ${txHash}`,
        {
          workerName: ctx.name,
          account: address,
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
      const isGracePeriodOver = now.diff(updatedAt, 'm') >= 10

      ctx.logger.info(
        `[${ctx.name}] grace period diff is ${now.diff(updatedAt, 'm')} `
      )

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

export async function unstakeLBs(ctx): Promise<void> {
  const apps = await fetchUsedApps()

  const { usedLBs, usedLBNames, usedOrphanedApps } = await mapAppsToLBs(
    apps,
    ctx
  )

  await findUnusedLBs({ usedLBs, usedLBNames, usedOrphanedApps, ctx })
}
