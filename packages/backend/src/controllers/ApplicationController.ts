import express, { Response, Request } from 'express'
import { typeGuard, QueryAppResponse } from '@pokt-network/pocket-js'
import { GetApplicationQuery } from './types'
import asyncMiddleware from '../middlewares/async'
import { authenticate } from '../middlewares/passport-auth'
import Application, { IApplication } from '../models/Application'
import ApplicationPool, { IPreStakedApp } from '../models/PreStakedApp'
import { IUser } from '../models/User'
import {
  composeDaysFromNowUtcDate,
  composeHoursFromNowUtcDate,
} from '../lib/date-utils'
import {
  influx,
  buildTotalAppRelaysQuery,
  buildSuccessfulAppRelaysQuery,
  buildDailyAppRelaysQuery,
  buildSessionRelaysQuery,
  buildLatestFilteredQueries,
  buildHourlyLatencyQuery,
} from '../lib/influx'
import HttpError from '../errors/http-error'
import MailgunService from '../services/MailgunService'
import { getApp } from '../lib/pocket'
import { APPLICATION_STATUSES } from '../application-statuses'

const router = express.Router()

router.use(authenticate)

router.get(
  '',
  asyncMiddleware(async (req: Request, res: Response) => {
    const id = (req.user as IUser)._id
    const application = await Application.find({
      status: APPLICATION_STATUSES.IN_SERVICE,
      user: id,
    })

    if (!application) {
      throw HttpError.NOT_FOUND({
        errors: [
          {
            id: 'NONEXISTENT_APPLICATION',
            message: 'User does not have an active application',
          },
        ],
      })
    }

    application.map((application) => {
      if (application.user.toString() !== id.toString()) {
        throw HttpError.FORBIDDEN({
          errors: [
            {
              id: 'UNAUTHORIZED_ACCESS',
              message: 'User does not have access to this application',
            },
          ],
        })
      }
    })

    await Promise.all(
      application.map(async (application) => {
        if (!application.updatedAt) {
          application.updatedAt = new Date(Date.now())
          await application.save()
        }
      })
    )

    const processedApplications = application.map(
      (app): GetApplicationQuery => ({
        apps: [
          {
            address: app.freeTierApplicationAccount.address,
            appId: app._id.toString(),
            publicKey: app.freeTierApplicationAccount.publicKey,
          },
        ],
        chain: app.chain,
        freeTier: app.freeTier,
        gatewaySettings: app.gatewaySettings,
        notificationSettings: app.notificationSettings,
        name: app.name,
        id: app._id.toString(),
        user: id,
        status: app.status,
        updatedAt: app.updatedAt,
      })
    )

    res.status(200).send(processedApplications)
  })
)

router.get(
  '/:applicationId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { applicationId } = req.params
    const application: IApplication = await Application.findById(applicationId)

    if (!application) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_APPLICATION',
            message: 'User does not have an active application',
          },
        ],
      })
    }

    if (application.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this application',
          },
        ],
      })
    }

    if (!application.updatedAt) {
      application.updatedAt = new Date(Date.now())
      await application.save()
    }

    const processedApplication: GetApplicationQuery = {
      apps: [
        {
          address: application.freeTierApplicationAccount.address,
          appId: application._id.toString(),
          publicKey: application.freeTierApplicationAccount.publicKey,
        },
      ],
      chain: application.chain,
      freeTier: application.freeTier,
      gatewaySettings: application.gatewaySettings,
      name: application.name,
      notificationSettings: application.notificationSettings,
      id: application._id.toString(),
      status: application.status,
      updatedAt: application.updatedAt,
    }

    res.status(200).send(processedApplication)
  })
)

router.get(
  '/status/:applicationId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { applicationId } = req.params
    const application: IApplication = await Application.findById(applicationId)

    if (!application) {
      throw HttpError.NOT_FOUND({
        errors: [
          {
            id: 'NONEXISTENT_APPLICATION',
            message: 'User does not have an active application',
          },
        ],
      })
    }
    if (application.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this application',
          },
        ],
      })
    }
    const app = await getApp(application.freeTierApplicationAccount.address)

    if (!typeGuard(app, QueryAppResponse)) {
      throw HttpError.INTERNAL_SERVER_ERROR({
        errors: [
          {
            id: 'POCKET_JS_ERROR',
            message: 'Application could not be fetched.',
          },
        ],
      })
    }

    const readableApp = app.toJSON()

    res.status(200).send({
      stake: readableApp.staked_tokens,
      relays: readableApp.max_relays,
    })
  })
)

router.put(
  '/:applicationId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const { gatewaySettings } = req.body
    const { applicationId } = req.params

    const application: IApplication = await Application.findById(applicationId)

    if (!application) {
      throw HttpError.BAD_REQUEST({
        errors: [
          { id: 'NONEXISTENT_APPLICATION', message: 'Application not found' },
        ],
      })
    }
    const userId = (req.user as IUser)._id

    if (application.user.toString() !== userId.toString()) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'Application does not belong to user',
          },
        ],
      })
    }
    application.gatewaySettings = gatewaySettings
    await application.save()
    // lodash's merge mutates the target object passed in.
    // This is what we want, as we don't want to lose any of the mongoose functionality
    // while at the same time updating the model itself
    res.status(204).send()
  })
)

router.post(
  '/switch/:applicationId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const { chain } = req.body
    const { applicationId } = req.params

    const replacementApplication: IPreStakedApp = await ApplicationPool.findOne(
      {
        chain,
        status: APPLICATION_STATUSES.SWAPPABLE,
      }
    )

    if (!replacementApplication) {
      throw new Error('No application for the selected chain is available')
    }
    const oldApplication: IApplication = await Application.findById(
      applicationId
    )

    if (!oldApplication) {
      throw new Error('Cannot find application')
    }
    if (oldApplication.user.toString() !== (req.user as IUser)._id.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'FOREIGN_APPLICATION',
            message: 'Application does not belong to user',
          },
        ],
      })
    }

    oldApplication.status = APPLICATION_STATUSES.AWAITING_GRACE_PERIOD
    oldApplication.lastChangedStatusAt = Date.now()
    await oldApplication.save()
    // Create a new Application for the user and copy the previous user config
    const newReplacementApplication = new Application({
      // As we're moving to a new chain, everything related to the account and gateway AAT
      // information will change, so we use all the data from the application that we took
      // from the pool.
      chain: replacementApplication.chain,
      freeTierApplicationAccount:
        replacementApplication.freeTierApplicationAccount,
      gatewayAAT: replacementApplication.gatewayAAT,
      status: APPLICATION_STATUSES.IN_SERVICE,
      lastChangedStatusAt: Date.now(),
      freeTier: true,
      updatedAt: new Date(Date.now()),
      // We wanna preserve user-related configuration fields, so we just copy them over
      // from the old application.
      name: oldApplication.name,
      user: oldApplication.user,
      gatewaySettings: oldApplication.gatewaySettings,
    })

    await newReplacementApplication.save()

    const processedApplication: GetApplicationQuery = {
      chain: newReplacementApplication.chain,
      name: newReplacementApplication.name,
      apps: [
        {
          address: newReplacementApplication.freeTierApplicationAccount.address,
          appId: newReplacementApplication._id.toString(),
          publicKey:
            newReplacementApplication.freeTierApplicationAccount.publicKey,
        },
      ],
      freeTier: newReplacementApplication.freeTier,
      gatewaySettings: newReplacementApplication.gatewaySettings,
      notificationSettings: newReplacementApplication.notificationSettings,
      id: newReplacementApplication._id.toString(),
      status: newReplacementApplication.status,
      updatedAt: newReplacementApplication.updatedAt,
    }

    res.status(200).send(processedApplication)
  })
)

router.put(
  '/notifications/:applicationId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const { applicationId } = req.params
    const { quarter, half, threeQuarters, full } = req.body
    const application = await Application.findById(applicationId)

    if (!application) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_APPLICATION',
            message: 'This application does not exist',
          },
        ],
      })
    }
    if (
      (application as IApplication).user.toString() !==
      (req.user as IUser)._id.toString()
    ) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'FOREIGN_APPLICATION',
            message: 'Application does not belong to user',
          },
        ],
      })
    }

    const emailService = new MailgunService()
    const isSignedUp = (application as IApplication).notificationSettings
      .signedUp
    const hasOptedOut = !(quarter || half || threeQuarters || full)

    ;(application as IApplication).notificationSettings = {
      signedUp: hasOptedOut ? false : true,
      quarter,
      half,
      threeQuarters,
      full,
    }
    await application.save()
    if (!isSignedUp) {
      emailService.send({
        templateName: 'NotificationSignup',
        toEmail: (req.user as IUser).email,
      })
    } else {
      emailService.send({
        templateName: 'NotificationChange',
        toEmail: (req.user as IUser).email,
      })
    }
    return res.status(204).send()
  })
)

router.get(
  '/total-relays/:applicationId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { applicationId } = req.params

    const application: IApplication = await Application.findById(applicationId)

    if (!application) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active Load Balancer',
          },
        ],
      })
    }
    if (application.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this load balancer',
          },
        ],
      })
    }

    const [{ _value = { _value: 0 } }] = await influx.collectRows(
      buildTotalAppRelaysQuery({
        publicKeys: [application.freeTierApplicationAccount.publicKey],
        start: '-24h',
        stop: '-0h',
      })
    )

    const processedRelaysAndLatency = {
      total_relays: _value || 0,
    }

    res.status(200).send(processedRelaysAndLatency)
  })
)

router.get(
  '/successful-relays/:applicationId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { applicationId } = req.params

    const application: IApplication = await Application.findById(applicationId)

    if (!applicationId) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active application',
          },
        ],
      })
    }
    if (application.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this application',
          },
        ],
      })
    }

    const [{ _value } = { _value: 0 }] = await influx.collectRows(
      buildSuccessfulAppRelaysQuery({
        publicKeys: [application.freeTierApplicationAccount.publicKey],
        start: '-24h',
        stop: '-0h',
      })
    )

    const processedSuccessfulRelays = {
      total_relays: _value || 0,
    }

    res.status(200).send(processedSuccessfulRelays)
  })
)

router.get(
  '/daily-relays/:applicationId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { applicationId } = req.params

    const application: IApplication = await Application.findById(applicationId)

    if (!applicationId) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active application',
          },
        ],
      })
    }
    if (application.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this application',
          },
        ],
      })
    }

    const rawDailyRelays = await influx.collectRows(
      buildDailyAppRelaysQuery({
        publicKeys: [application.freeTierApplicationAccount.publicKey],
        start: composeDaysFromNowUtcDate(7),
        stop: composeHoursFromNowUtcDate(0),
      })
    )

    const processedDailyRelays = rawDailyRelays.map(
      ({ _value }: { _value: number; _time: string }, i) => {
        return {
          bucket: composeDaysFromNowUtcDate(7 - i),
          dailyRelays: _value ?? 0,
        }
      }
    )

    const processedDailyRelaysResponse = {
      daily_relays: processedDailyRelays,
    }

    res.status(200).send(processedDailyRelaysResponse)
  })
)

router.get(
  '/session-relays/:applicationId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { applicationId } = req.params

    const application: IApplication = await Application.findById(applicationId)

    if (!applicationId) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active application',
          },
        ],
      })
    }
    if (application.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this application',
          },
        ],
      })
    }

    const [{ _value }] = await influx.collectRows(
      buildSessionRelaysQuery({
        publicKeys: [application.freeTierApplicationAccount.publicKey],
        start: '-60m',
        stop: '-0m',
      })
    )

    res.status(200).send({
      session_relays: _value,
    })
  })
)

router.post(
  '/latest-relays',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { id } = req.body

    const application: IApplication = await Application.findById(id)

    if (!id) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active application',
          },
        ],
      })
    }
    if (application.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this application',
          },
        ],
      })
    }

    const rawLatestRelays = await influx.collectRows(
      buildLatestFilteredQueries({
        publicKeys: [application.freeTierApplicationAccount.publicKey],
        start: '-1h',
        stop: '-0h',
      })
    )

    const processedLatestRelays = rawLatestRelays.map(
      ({ method, bytes_200, bytes_500, elapsedTime_200, elapsedTime_500 }) => {
        return {
          method,
          bytes: bytes_200 ?? bytes_500 ?? 0,
          result: bytes_200 ? '200' : '500',
          elapsedTime: elapsedTime_200 ?? elapsedTime_500 ?? 0,
        }
      }
    )

    res.status(200).send({
      session_relays: processedLatestRelays,
    })
  })
)

router.post(
  '/latest-successful-relays',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id

    const { id, limit, offset } = req.body

    const application: IApplication = await Application.findById(id)

    if (!application) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active application',
          },
        ],
      })
    }
    if (application.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this load balancer',
          },
        ],
      })
    }

    const rawLatestRelays = await influx.collectRows(
      buildLatestFilteredQueries({
        publicKeys: [application.freeTierApplicationAccount.publicKey],
        start: '-1h',
        stop: '-0h',
        result: '200',
      })
    )

    const processedLatestRelays = rawLatestRelays.map(
      ({
        method,
        bytes_200,
        bytes_500,
        elapsedTime_200,
        elapsedTime_500,
        nodePublicKey,
      }) => {
        return {
          bytes: bytes_200 ?? bytes_500 ?? 0,
          elapsedTime: elapsedTime_200 ?? elapsedTime_500 ?? 0,
          method,
          nodePublicKey,
          result: bytes_200 ? '200' : '500',
        }
      }
    )

    res.status(200).send({
      session_relays: processedLatestRelays,
    })
  })
)

router.post(
  '/latest-failing-relays',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id

    const { id } = req.body

    const application: IApplication = await Application.findById(id)

    if (!application) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active application',
          },
        ],
      })
    }
    if (application.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this load balancer',
          },
        ],
      })
    }

    const rawLatestRelays = await influx.collectRows(
      buildLatestFilteredQueries({
        publicKeys: [application.freeTierApplicationAccount.publicKey],
        start: '-1h',
        stop: '-0h',
        result: '500',
      })
    )

    const processedLatestRelays = rawLatestRelays.map(
      ({
        method,
        bytes_200,
        bytes_500,
        elapsedTime_200,
        elapsedTime_500,
        nodePublicKey,
      }) => {
        return {
          bytes: bytes_200 ?? bytes_500 ?? 0,
          elapsedTime: elapsedTime_200 ?? elapsedTime_500 ?? 0,
          method,
          nodePublicKey,
          result: bytes_200 ? '200' : '500',
        }
      }
    )

    res.status(200).send({
      session_relays: processedLatestRelays,
    })
  })
)

router.get(
  '/ranged-relays/:applicationId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { applicationId } = req.params

    const application: IApplication = await Application.findById(applicationId)

    if (!applicationId) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active application',
          },
        ],
      })
    }
    if (application.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this application',
          },
        ],
      })
    }

    const [{ _value } = { _value: 0 }] = await influx.collectRows(
      buildTotalAppRelaysQuery({
        publicKeys: [application.freeTierApplicationAccount.publicKey],
        start: '-48h',
        stop: '-24h',
      })
    )

    const processedTotalRangedRelays = {
      total_relays: _value || 0,
    }

    res.status(200).send(processedTotalRangedRelays)
  })
)

router.get(
  '/previous-successful-relays/:applicationId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { applicationId } = req.params

    const application: IApplication = await Application.findById(applicationId)

    if (!applicationId) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active application',
          },
        ],
      })
    }
    if (application.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this application',
          },
        ],
      })
    }

    const [{ _value } = { _value: 0 }] = await influx.collectRows(
      buildSuccessfulAppRelaysQuery({
        publicKeys: [application.freeTierApplicationAccount.publicKey],
        start: '-48h',
        stop: '-24h',
      })
    )

    const processedPreviousSuccessfulRelaysResponse = {
      successful_relays: _value,
    }

    res.status(200).send(processedPreviousSuccessfulRelaysResponse)
  })
)

router.get(
  '/hourly-latency/:applicationId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { applicationId } = req.params

    const application: IApplication = await Application.findById(applicationId)

    if (!applicationId) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active application',
          },
        ],
      })
    }
    if (application.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this application',
          },
        ],
      })
    }

    const rawHourlyLatency = await influx.collectRows(
      buildHourlyLatencyQuery({
        publicKeys: [application.freeTierApplicationAccount.publicKey],
        start: composeHoursFromNowUtcDate(24),
        stop: '-0h',
      })
    )

    const processedHourlyLatency = rawHourlyLatency.map(
      ({ _value, _time }) => ({ bucket: _time, latency: _value ?? 0 })
    )

    const processedHourlyLatencyResponse = {
      hourly_latency: processedHourlyLatency,
    }

    res.status(200).send(processedHourlyLatencyResponse)
  })
)

export default router
