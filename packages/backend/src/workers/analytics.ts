import * as Amplitude from '@amplitude/node'
import { influx, buildNotificationsQuery } from '../lib/influx'
import Application from '../models/Application'
import LoadBalancer from '../models/LoadBalancer'
import User from '../models/User'
import { composeHoursFromNowUtcDate } from '../lib/date-utils'
import env from '../environment'

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
  ctx: any
): Promise<{
  emailsByID: Map<string, string>
  userIDsByID: Map<string, string>
  usageByID: Map<string, number>
  lbNamesByID: Map<string, string>
}> {
  const LBsUsed = new Map<string, number>()
  const LBEmails = new Map<string, string>()
  const LBNames = new Map<string, string>()
  const LBUserIDs = new Map<string, string>()

  for (const [publicKey, relays] of appsUsed) {
    const app = await Application.findOne({
      'freeTierApplicationAccount.publicKey': `${publicKey}`,
    })

    if (!app) {
      continue
    }

    const lb = await LoadBalancer.findOne({
      applicationIDs: `${app.id.toString()}`,
    })

    if (!lb) {
      ctx.logger.warn(
        `App ${app.freeTierApplicationAccount.address} ${app.name} is not associated with any load balancer but presents usage.`
      )
      continue
    }

    let userID = lb?.user

    if (!userID) {
      ctx.logger.info(
        `Didn't find an user for ${lb ? 'lb' : 'app'} ${
          lb ? lb?._id.toString() : app._id.toString()
        }`
      )
      continue
    }

    const idType = userID.toString().includes('@') ? 'email' : 'id'

    const user = await User.findOne(
      // @ts-ignore
      idType === 'id' ? { _id: userID } : { email: userID }
    )

    if (!user) {
      ctx.logger.info(`Didn't find user with ${userID}`)
      continue
    }

    const id = lb._id.toString()

    const totalUsage = LBsUsed.get(id) ?? 0

    LBsUsed.set(id, totalUsage + relays)
    LBEmails.set(id, user.email)
    LBNames.set(id, lb ? lb?.name : app.name)
    LBUserIDs.set(lb._id.toString(), userID.toString())
  }

  return {
    emailsByID: LBEmails,
    userIDsByID: LBUserIDs,
    usageByID: LBsUsed,
    lbNamesByID: LBNames,
  }
}

export async function sendRelayCountByEmail({
  emailsByID,
  userIDsByID,
  usageByID,
  ctx,
}: {
  emailsByID: Map<string, string>
  userIDsByID: Map<string, string>
  usageByID: Map<string, number>
  ctx: any
}): Promise<void> {
  for (const [id, usage] of usageByID) {
    const userID = userIDsByID.get(id)

    if (!userID) {
      ctx.logger.info(`Unknown ID ${userID}`)
      continue
    }

    const email = emailsByID.get(id)
    // send email
    const amplitudeClient = Amplitude.init(env('AMPLITUDE_API_KEY') as string)

    ctx.logger.info(`${email} logged ${usage} usage in the past 1h`)

    await amplitudeClient.logEvent({
      event_type: 'RELAY_METRIC_UPDATE',
      user_id: id,
      event_properties: { amount: usage },
      user_properties: { email: emailsByID.get(id) },
    })

    await amplitudeClient.flush()
  }
}

export async function registerAnalytics(ctx): Promise<void> {
  const apps = await fetchUsedApps()

  const { emailsByID, userIDsByID, usageByID } = await mapUsageToLBs(apps, ctx)

  await sendRelayCountByEmail({
    emailsByID,
    userIDsByID,
    usageByID,
    ctx,
  })
}
