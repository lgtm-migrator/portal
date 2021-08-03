/* eslint-disable no-prototype-builtins */
import dayjs from 'dayjs'
import MailgunService from '../services/MailgunService'
import Application, { IApplication } from '../models/Application'
import User from '../models/User'
import { composeTodayUtcDate } from '../lib/date-utils'
import { influx, buildSuccessfulAppRelaysQuery } from '../lib/influx'

const LAST_SENT_SUFFIX = 'LastSent'

const THRESHOLDS = new Map([
  ['quarter', 25000],
  ['half', 50000],
  ['threeQuarters', 75000],
  ['full', 100000],
])

async function fetchRelayData(publicKey: string) {
  const today = composeTodayUtcDate()

  const [{ _value } = { _value: 0 }] = await influx.collectRows(
    buildSuccessfulAppRelaysQuery({
      publicKeys: [publicKey],
      start: today,
      stop: '-0h',
    })
  )

  return _value
}

function calculateExceededThreshold(servedRelays: number) {
  let highestThresholdExceeded = 0
  let thresholdKey = ''

  for (const [key, threshold] of THRESHOLDS.entries()) {
    if (servedRelays > threshold) {
      highestThresholdExceeded = threshold
      thresholdKey = key
    }
  }
  return [thresholdKey, highestThresholdExceeded]
}

export function getTimeDifferenceExceeded(
  notificationSettings,
  thresholdKey
): boolean {
  if (!(`${thresholdKey}${LAST_SENT_SUFFIX}` in notificationSettings)) {
    return false
  }
  // Edge case: if days are different no matter time elapsed we should be able to send the email
  const sent = dayjs(notificationSettings[`${thresholdKey}${LAST_SENT_SUFFIX}`])
  const now = dayjs()

  if (sent.date() !== now.date()) {
    return true
  }
  return (
    dayjs().diff(
      notificationSettings[`${thresholdKey}${LAST_SENT_SUFFIX}`] ?? dayjs(),
      'day'
    ) > 0
  )
}

export async function sendUsageNotifications(ctx): Promise<void> {
  const applications: IApplication[] = await Application.find({
    status: { $exists: true },
    notificationSettings: { $exists: true },
  })

  for (const application of applications) {
    const {
      freeTierApplicationAccount,
      notificationSettings,
      user: userId,
      name: appName,
      _id: appId,
    } = application
    const { publicKey } = freeTierApplicationAccount
    const servedRelays = await fetchRelayData(publicKey)
    const [thresholdKey, highestThresholdExceeded] = calculateExceededThreshold(
      servedRelays
    )
    const shouldSendNotification =
      highestThresholdExceeded > 0 &&
      notificationSettings[thresholdKey] &&
      getTimeDifferenceExceeded(notificationSettings, thresholdKey)

    if (shouldSendNotification) {
      const user = await User.findById(userId)

      if (!user) {
        ctx.logger.warn(
          `NOTICE(Notifications): Orphaned app ${appId}) from user ${userId} getting usage.`
        )
      }

      const { email: userEmail = '' } = user
      const emailService = new MailgunService()
      const totalUsage = (
        (servedRelays / THRESHOLDS.get('full')) *
        100
      ).toFixed(2)

      ctx.logger.log(
        `Notifying app ${appName} (ID: ${appId}) from user ${userId} of ${totalUsage}% usage`
      )

      emailService.send({
        templateData: {
          app_name: appName,
          app_id: appId.toString(),
          usage: `${totalUsage}%`,
        },
        templateName: 'NotificationThresholdHit',
        toEmail: userEmail,
      })
      ;(application as any).notificationSettings[
        `${thresholdKey}${LAST_SENT_SUFFIX}`
      ] = new Date(Date.now())
      await application.save()
    }
  }
}
