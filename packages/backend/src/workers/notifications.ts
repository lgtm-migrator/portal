import { QueryAppResponse } from '@pokt-network/pocket-js'
import { influx, buildNotificationsQuery } from '../lib/influx'
import Application, { INotificationSettings } from '../models/Application'
import LoadBalancer from '../models/LoadBalancer'
import User from '../models/User'
import MailgunService from '../services/MailgunService'
import { getApp } from '../lib/pocket'
import { cache, getResponseFromCache } from '../redis'
import {
  composeHoursFromNowUtcDate,
  getSecondsUntilTomorrowUtc,
} from '../lib/date-utils'
import { notificationLog } from '../lib/logger'

const DEFAULT_FREETIER_LIMIT = 42080

const DEFAULT_NOTIFICATION_SETTINGS = {
  quarter: false,
  half: false,
  threeQuarters: true,
  full: true,
}

const THRESHOLDS = {
  QUARTER: 0,
  HALF: 1,
  THREE_QUARTERS: 2,
  FULL: 3,
}

export async function fetchUsedApps(): Promise<Map<string, number>> {
  const rawAppsUsed = await influx.collectRows(
    buildNotificationsQuery({
      start: composeHoursFromNowUtcDate(1),
      stop: composeHoursFromNowUtcDate(0),
    })
  )

  const appsUsed = new Map<string, number>()

  rawAppsUsed.map(({ _value, applicationPublicKey }) => {
    const total = appsUsed.get(applicationPublicKey) ?? 0

    appsUsed.set(applicationPublicKey, total + _value)
  })

  return appsUsed
}

export async function mapUsageToLBs(
  appsUsed: Map<string, number>,
  _ctx: any
): Promise<{
  emailsByID: Map<string, string>
  limitsByID: Map<string, number>
  namesByID: Map<string, string>
  preferencesByLB: Map<string, INotificationSettings>
  usageByID: Map<string, number>
}> {
  const LBsUsed = new Map<string, number>()
  const LBEmails = new Map<string, string>()
  const LBNames = new Map<string, string>()
  const LBLimits = new Map<string, number>()
  const LBPreferences = new Map<string, INotificationSettings>()

  for (const [publicKey, relays] of appsUsed) {
    const app = await Application.findOne({
      'freeTierApplicationAccount.publicKey': `${publicKey}`,
    })

    if (!app) {
      continue
    }

    // @ts-ignore
    const onChainApp = (await getApp(
      app.freeTierApplicationAccount.address
    )) as QueryAppResponse

    const { max_relays: maxRelays } = onChainApp.toJSON()

    const lb = await LoadBalancer.findOne({
      applicationIDs: `${app?.id.toString()}`,
    })

    const id = lb ? lb._id.toString() : app._id.toString()

    const LBUserType = lb
      ? lb.user.toString().includes('@')
        ? 'email'
        : 'id'
      : 'nonexistent'

    const userID = lb ? lb.user.toString() : app.user.toString()
    const userSearchTerm = lb
      ? LBUserType === 'email'
        ? { email: userID }
        : { _id: userID }
      : { email: userID }

    const user = await User.findOne(userSearchTerm)

    const totalUsage = LBsUsed.get(id) ?? 0
    const totalLimit = LBLimits.get(id) ?? 0

    LBsUsed.set(id, totalUsage + relays)
    LBEmails.set(id, user?.email)
    LBNames.set(id, lb ? lb.name : app.name)
    LBLimits.set(id, totalLimit + maxRelays)
    if (!LBPreferences.has(id)) {
      LBPreferences.set(id, app.notificationSettings)
    }
  }

  return {
    emailsByID: LBEmails,
    limitsByID: LBLimits,
    namesByID: LBNames,
    preferencesByLB: LBPreferences,
    usageByID: LBsUsed,
  }
}

export async function sendEmailByThreshold({
  emailsByID,
  limitsByID,
  namesByID,
  preferencesByLB,
  usageByID,
  ctx,
}: {
  emailsByID: Map<string, string>
  limitsByID: Map<string, number>
  namesByID: Map<string, string>
  preferencesByLB: Map<string, INotificationSettings>
  usageByID: Map<string, number>
  ctx: any
}): Promise<void> {
  for (const [id, usage] of usageByID) {
    const limit = limitsByID.get(id) ?? DEFAULT_FREETIER_LIMIT

    const lbThresholds = preferencesByLB.get(id)

    const lbPreferences =
      Object.keys(lbThresholds).length === 0
        ? DEFAULT_NOTIFICATION_SETTINGS
        : lbThresholds

    let thresholdExceeded = -1

    if (lbPreferences.quarter && usage >= limit * 0.25) {
      thresholdExceeded = THRESHOLDS.QUARTER
    }

    if (lbPreferences.half && usage >= limit * 0.5) {
      thresholdExceeded = THRESHOLDS.HALF
    }

    if (lbPreferences.threeQuarters && usage >= limit * 0.75) {
      thresholdExceeded = THRESHOLDS.THREE_QUARTERS
    }

    if (lbPreferences.full && usage >= limit) {
      thresholdExceeded = THRESHOLDS.FULL
    }

    // check cache for existing key ttl
    const cachedThreshold = await getResponseFromCache(
      `portal-notification-threshold`
    )

    if (thresholdExceeded === -1) {
      ctx.logger.info(
        `[${ctx.name}] No need to send email to app ${namesByID.get(
          id
        )} [${id}]; No threshold has been exceeded.`
      )
      return
    }

    // We can bail out if the notification we're sending is lesser than the last one sent
    if (cachedThreshold && cachedThreshold >= thresholdExceeded) {
      ctx.logger.info(
        `[${ctx.name}] No need to send email to app ${namesByID.get(
          id
        )} [${id}]; threshold exceeded (${thresholdExceeded}) is lesser than the last cached threshold (${cachedThreshold}) `
      )
      return
    }

    // if there's nothing cached, we can go ahead and send the email
    cache.set(id, thresholdExceeded, 'EX', getSecondsUntilTomorrowUtc())
    ctx.logger.info(
      `[${
        ctx.name
      }] Saved threshold ${thresholdExceeded} to cache for app ${namesByID.get(
        id
      )} [${id}].`
    )

    ctx.logger.info(
      `[${ctx.name}] Endpoint ${namesByID.get(
        id
      )} [${id}] usage is ${usage} (limit: ${limit})`,
      {
        workerName: ctx.name,
        appID: id,
        kind: 'notificationLog',
        usage,
        limit,
      } as notificationLog
    )

    // send email
    const emailService = new MailgunService()

    await emailService.send({
      templateData: {
        app_name: namesByID.get(id),
        app_id: id,
        usage: (usage / limit).toFixed(2),
      },
      templateName: 'NotificationThresholdHit',
      toEmail: emailsByID.get(id),
    })

    ctx.logger.info(
      `[${ctx.name}] Sent email to endpoint ${namesByID.get(id)} [${id}]`
    )
  }
}

export async function notifyUsage(ctx): Promise<void> {
  const apps = await fetchUsedApps()

  const { emailsByID, limitsByID, namesByID, preferencesByLB, usageByID } =
    await mapUsageToLBs(apps, ctx)

  await sendEmailByThreshold({
    emailsByID,
    limitsByID,
    namesByID,
    preferencesByLB,
    usageByID,
    ctx,
  })
}
