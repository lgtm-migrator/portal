import express, { Response, Request } from 'express'
import crypto from 'crypto'
import { typeGuard, QueryAppResponse } from '@pokt-network/pocket-js'
import { IAppInfo, GetApplicationQuery } from './types'
import { cache, getResponseFromCache, LB_METRICS_TTL } from '../redis'
import env from '../environment'
import asyncMiddleware from '../middlewares/async'
import { authenticate } from '../middlewares/passport-auth'
import Application, { IApplication } from '../models/Application'
import ApplicationPool, { IPreStakedApp } from '../models/PreStakedApp'
import LoadBalancer, { ILoadBalancer } from '../models/LoadBalancer'
import { IUser } from '../models/User'
import {
  composeDaysFromNowUtcDate,
  composeHoursFromNowUtcDate,
} from '../lib/date-utils'
import {
  influx,
  buildDailyAppRelaysQuery,
  buildHourlyLatencyQuery,
  buildLatestFilteredQueries,
  buildSessionRelaysQuery,
  buildSuccessfulAppRelaysQuery,
  buildTotalAppRelaysQuery,
  buildOriginClassificationQuery,
} from '../lib/influx'
import { getApp } from '../lib/pocket'
import HttpError from '../errors/http-error'
import MailgunService from '../services/MailgunService'
import { APPLICATION_STATUSES } from '../application-statuses'
import Blockchains from '../models/Blockchains'

const DEFAULT_GATEWAY_SETTINGS = {
  secretKey: '',
  secretKeyRequired: false,
  whitelistOrigins: [],
  whitelistUserAgents: [],
}
const DEFAULT_TIMEOUT = 5000
const MAX_USER_ENDPOINTS = 2

async function getLBPublicKeys(appIDs: string[], lbID: string) {
  const cachedPublicKeys = await getResponseFromCache(`${lbID}-pks`)
  const publicKeys = cachedPublicKeys
    ? JSON.parse(cachedPublicKeys as string)
    : await Promise.all(
        appIDs.map(async function getData(applicationID) {
          const application: IApplication = await Application.findById(
            applicationID
          )

          return application.freeTierApplicationAccount.publicKey
        })
      )

  if (!cachedPublicKeys) {
    await cache.set(
      `${lbID}-pks`,
      JSON.stringify(publicKeys),
      'EX',
      LB_METRICS_TTL
    )
  }

  return publicKeys
}

const router = express.Router()

router.use(authenticate)

router.get(
  '',
  asyncMiddleware(async (req: Request, res: Response) => {
    const id = (req.user as IUser)._id
    const lbs = await LoadBalancer.find({
      user: id,
    })

    if (!lbs) {
      throw HttpError.NOT_FOUND({
        errors: [
          {
            id: 'NONEXISTENT_APPLICATION',
            message: 'User does not have an active application',
          },
        ],
      })
    }

    // Process all the LBs to "clean them up" for the interface.
    const processedLbs = await Promise.all(
      lbs.map(async (lb) => {
        if (!lb.applicationIDs.length) {
          // Remove user association with empty LBs. This means their apps have no usage and have been removed, so this LB should be removed (and will be done so automatically after some time).
          lb.user = null
          await lb.save()
          return
        }

        if (!lb.updatedAt) {
          lb.updatedAt = new Date(Date.now())
        }
        const apps: IAppInfo[] = []

        // pre process apps
        const cleanedApplicationIDs = []

        for (const appID of lb.applicationIDs) {
          if (!appID) {
            continue
          }

          const app = await Application.findById(appID)

          if (!app) {
            continue
          }

          cleanedApplicationIDs.push(appID)
        }

        lb.applicationIDs = cleanedApplicationIDs

        await lb.save()

        for (const appId of cleanedApplicationIDs) {
          const app = await Application.findById(appId)

          apps.push({
            appId: app._id.toString(),
            address: app.freeTierApplicationAccount.address,
            publicKey: app.freeTierApplicationAccount.publicKey,
          })
        }

        const app = await Application.findById(lb.applicationIDs[0])

        const onChainApp = (
          (await getApp(
            app.freeTierApplicationAccount.address
          )) as QueryAppResponse
        ).toJSON()

        const { chains } = onChainApp

        const [chain] = chains

        app.chain = chain

        await app.save()

        const processedLb: GetApplicationQuery = {
          apps,
          chain: chain,
          createdAt: new Date(Date.now()),
          updatedAt: lb.updatedAt,
          freeTier: app.freeTier,
          gatewaySettings: app.gatewaySettings,
          notificationSettings: app.notificationSettings,
          name: lb.name,
          id: lb._id.toString(),
          user: id,
          status: app.status,
        }

        return processedLb
      })
    )

    res
      .status(200)
      .send(processedLbs.filter((lb) => lb).filter((lb) => lb.user))
  })
)

router.post(
  '',
  asyncMiddleware(async (req: Request, res: Response) => {
    const { name, chain, gatewaySettings = DEFAULT_GATEWAY_SETTINGS } = req.body

    const id = (req.user as IUser)._id
    const userLBs = await LoadBalancer.find({ user: id })

    const isNewAppRequestInvalid =
      userLBs.length >= MAX_USER_ENDPOINTS &&
      !(env('GODMODE_ACCOUNTS') as string[]).includes(id.toString())

    if (isNewAppRequestInvalid) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'ALREADY_EXISTING',
            message: 'User has reached their free app limit.',
          },
        ],
      })
    }
    const preStakedApp: IPreStakedApp = await ApplicationPool.findOne({
      status: APPLICATION_STATUSES.SWAPPABLE,
      chain,
    })

    if (!preStakedApp) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'POOL_EMPTY',
            message: 'No pre-staked apps available for this chain.',
          },
        ],
      })
    }
    const application = new Application({
      chain,
      name,
      user: id,
      status: APPLICATION_STATUSES.IN_SERVICE,
      lastChangedStatusAt: new Date(Date.now()),
      // We enforce every app to be treated as a free-tier app for now.
      freeTier: true,
      freeTierApplicationAccount: preStakedApp.freeTierApplicationAccount,
      gatewayAAT: preStakedApp.gatewayAAT,
      gatewaySettings: {
        ...gatewaySettings,
      },
      notificationSettings: {
        signedUp: false,
        quarter: false,
        half: false,
        threeQuarters: true,
        full: true,
      },
    })

    application.gatewaySettings.secretKey = crypto
      .randomBytes(16)
      .toString('hex')

    await application.save()

    const { ok } = await ApplicationPool.deleteOne({ _id: preStakedApp._id })

    if (ok !== 1) {
      throw HttpError.INTERNAL_SERVER_ERROR({
        errors: [
          {
            id: 'DB_ERROR',
            message: 'There was an error while updating the DB',
          },
        ],
      })
    }

    const blockchain = await Blockchains.findOne({ _id: application.chain })

    const timeout = blockchain?.requestTimeOut ?? DEFAULT_TIMEOUT

    const loadBalancer: ILoadBalancer = new LoadBalancer({
      user: id,
      name,
      requestTimeOut: timeout,
      applicationIDs: [application._id.toString()],
      updatedAt: new Date(Date.now()),
      createdAt: new Date(Date.now()),
    })

    await loadBalancer.save()

    const processedLb: GetApplicationQuery = {
      chain,
      createdAt: new Date(Date.now()),
      updatedAt: loadBalancer.updatedAt,
      name: loadBalancer.name,
      id: loadBalancer._id.toString(),
      freeTier: true,
      status: application.status,
      apps: [
        {
          appId: application._id.toString(),
          address: application.freeTierApplicationAccount.address,
          publicKey: application.freeTierApplicationAccount.publicKey,
        },
      ],
      user: id,
      gatewaySettings: application.gatewaySettings,
      notificationSettings: application.notificationSettings,
    }

    res.status(200).send(processedLb)
  })
)

router.put(
  '/:lbId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const { gatewaySettings } = req.body
    const { lbId } = req.params
    const userId = (req.user as IUser)._id

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      throw HttpError.BAD_REQUEST({
        errors: [
          { id: 'NONEXISTENT_APPLICATION', message: 'Application not found' },
        ],
      })
    }

    if (loadBalancer.user.toString() !== userId.toString()) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'Application does not belong to user',
          },
        ],
      })
    }

    const existingKeys = await Promise.all(
      loadBalancer.applicationIDs.map(async function changeSettings(
        applicationId
      ) {
        const application: IApplication = await Application.findById(
          applicationId
        )

        return application.gatewaySettings?.secretKey ?? ''
      })
    )

    const secretKey = existingKeys.find((k) => k !== '')

    const processedGatewaySettings = { ...gatewaySettings, secretKey }

    await Promise.all(
      loadBalancer.applicationIDs.map(async function changeSettings(
        applicationId
      ) {
        const application: IApplication = await Application.findById(
          applicationId
        )

        application.gatewaySettings = processedGatewaySettings
        await application.save()
      })
    )

    loadBalancer.updatedAt = new Date(Date.now())
    await loadBalancer.save()

    res.status(204).send()
  })
)

router.get(
  '/status/:lbId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params
    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      throw HttpError.BAD_REQUEST({
        errors: [
          { id: 'NONEXISTENT_APPLICATION', message: 'Application not found' },
        ],
      })
    }

    if (loadBalancer.user.toString() !== userId.toString()) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'Application does not belong to user',
          },
        ],
      })
    }

    const apps = await Promise.all(
      loadBalancer.applicationIDs.map(async function getApps(applicationId) {
        const application: IApplication = await Application.findById(
          applicationId
        )

        return await getApp(application.freeTierApplicationAccount.address)
      })
    )

    const isAppResponseOk = apps.reduce(
      (ok, app) => ok || typeGuard(app, QueryAppResponse),
      true
    )

    if (!isAppResponseOk) {
      throw HttpError.INTERNAL_SERVER_ERROR({
        errors: [
          {
            id: 'POCKET_JS_ERROR',
            message: 'Application could not be fetched.',
          },
        ],
      })
    }

    const readableApps = apps.map((app: QueryAppResponse) => app.toJSON())

    const appsStatus = readableApps.reduce(
      (status, app) => {
        return {
          stake: app.staked_tokens + status.stake,
          relays: app.max_relays + status.relays,
        }
      },
      {
        stake: 0,
        relays: 0,
      }
    )

    res.status(200).send(appsStatus)
  })
)

router.put(
  '/notifications/:lbId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params
    const { quarter, half, threeQuarters, full } = req.body
    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      throw HttpError.BAD_REQUEST({
        errors: [
          { id: 'NONEXISTENT_APPLICATION', message: 'Application not found' },
        ],
      })
    }

    if (loadBalancer.user.toString() !== userId.toString()) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'Application does not belong to user',
          },
        ],
      })
    }
    const emailService = new MailgunService()
    const hasOptedOut = !(quarter || half || threeQuarters || full)

    const notificationSettings = {
      signedUp: hasOptedOut ? false : true,
      quarter,
      half,
      threeQuarters,
      full,
    }

    await Promise.all(
      loadBalancer.applicationIDs.map(async (id) => {
        const app = await Application.findById(id)

        app.notificationSettings = notificationSettings

        await app.save()
      })
    )

    loadBalancer.updatedAt = new Date(Date.now())

    await loadBalancer.save()

    emailService.send({
      templateName: 'NotificationChange',
      toEmail: (req.user as IUser).email,
    })

    return res.status(204).send()
  })
)

router.post(
  '/switch/:lbId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { chain } = req.body
    const { lbId } = req.params
    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    const appsInPool = await ApplicationPool.find({
      chain,
      status: APPLICATION_STATUSES.SWAPPABLE,
    })

    if (!loadBalancer) {
      throw HttpError.BAD_REQUEST({
        errors: [
          { id: 'NONEXISTENT_APPLICATION', message: 'Application not found' },
        ],
      })
    }

    if (loadBalancer.user.toString() !== userId.toString()) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'Application does not belong to user',
          },
        ],
      })
    }

    if (loadBalancer.applicationIDs.length > appsInPool.length) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'TOO_MANY_APPS',
            message: 'Too many applications in Load Balancer',
          },
        ],
      })
    }

    const newApps = await Promise.all(
      loadBalancer.applicationIDs.map(async function switchApp(applicationId) {
        const replacementApplication: IPreStakedApp = appsInPool.pop()

        if (!replacementApplication) {
          throw new Error('No application for the selected chain is available')
        }
        const oldApplication: IApplication = await Application.findById(
          applicationId
        )

        if (!oldApplication) {
          throw new Error('Cannot find application')
        }
        if (
          oldApplication.user.toString() !== (req.user as IUser)._id.toString()
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
          // We wanna preserve user-related configuration fields, so we just copy them over
          // from the old application.
          name: oldApplication.name,
          user: oldApplication.user,
          gatewaySettings: oldApplication.gatewaySettings,
        })

        await newReplacementApplication.save()

        return {
          appId: newReplacementApplication._id.toString(),
          address: newReplacementApplication.freeTierApplicationAccount.address,
          publicKey:
            newReplacementApplication.freeTierApplicationAccount.publicKey,
        }
      })
    )

    loadBalancer.applicationIDs = newApps.map((app) => app.appId)
    loadBalancer.updatedAt = new Date(Date.now())

    await loadBalancer.save()
    const newestApp = await Application.findById(loadBalancer.applicationIDs[0])

    const processedLb: GetApplicationQuery = {
      chain: newestApp.chain,
      name: loadBalancer.name,
      apps: newApps,
      createdAt: loadBalancer.createdAt,
      updatedAt: loadBalancer.updatedAt,
      freeTier: true,
      id: loadBalancer._id.toString(),
      gatewaySettings: newestApp.gatewaySettings,
      notificationSettings: newestApp.notificationSettings,
      status: newestApp.status,
    }

    res.status(200).send(processedLb)
  })
)

router.post(
  '/remove/:lbId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params
    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      throw HttpError.BAD_REQUEST({
        errors: [
          { id: 'NONEXISTENT_APPLICATION', message: 'Application not found' },
        ],
      })
    }

    if (loadBalancer.user.toString() !== userId.toString()) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'Application does not belong to user',
          },
        ],
      })
    }

    await Promise.all(
      loadBalancer.applicationIDs.map(async function switchApp(applicationId) {
        const application: IApplication = await Application.findById(
          applicationId
        )

        if (!application) {
          throw new Error('Cannot find application')
        }

        // Send it into the queue for removal categorization (see unstaker.ts)
        application.status = APPLICATION_STATUSES.AWAITING_GRACE_PERIOD
        application.updatedAt = new Date(Date.now())
        await application.save()
      })
    )

    loadBalancer.user = null
    loadBalancer.updatedAt = new Date(Date.now())

    await loadBalancer.save()

    res.status(204).send()
  })
)

router.get(
  '/total-relays/:lbId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active Load Balancer',
          },
        ],
      })
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this load balancer',
          },
        ],
      })
    }

    const cachedMetricResponse = await getResponseFromCache(
      `${lbId}-total-relays`
    )

    if (cachedMetricResponse) {
      return res.status(200).send(JSON.parse(cachedMetricResponse as string))
    }

    const appIds = loadBalancer.applicationIDs
    const publicKeys = await getLBPublicKeys(appIds, lbId)

    const [{ _value = { _value: 0 } } = { _value: 0 }] =
      await influx.collectRows(
        buildTotalAppRelaysQuery({
          publicKeys,
          start: '-24h',
          stop: '-0h',
        })
      )

    const processedRelaysAndLatency = {
      total_relays: _value || 0,
    }

    await cache.set(
      `${lbId}-total-relays`,
      JSON.stringify(processedRelaysAndLatency),
      'EX',
      LB_METRICS_TTL
    )

    res.status(200).send(processedRelaysAndLatency)
  })
)

router.get(
  '/successful-relays/:lbId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active Load Balancer',
          },
        ],
      })
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this load balancer',
          },
        ],
      })
    }

    const cachedMetricResponse = await getResponseFromCache(
      `${lbId}-successful-relays`
    )

    if (cachedMetricResponse) {
      return res.status(200).send(JSON.parse(cachedMetricResponse as string))
    }

    const appIds = loadBalancer.applicationIDs
    const publicKeys = await getLBPublicKeys(appIds, lbId)

    const [{ _value } = { _value: 0 }] = await influx.collectRows(
      buildSuccessfulAppRelaysQuery({
        publicKeys,
        start: '-24h',
        stop: '-0h',
      })
    )

    const processedSuccessfulRelays = {
      total_relays: _value || 0,
    }

    await cache.set(
      `${lbId}-successful-relays`,
      JSON.stringify(processedSuccessfulRelays),
      'EX',
      LB_METRICS_TTL
    )

    res.status(200).send(processedSuccessfulRelays)
  })
)

router.get(
  '/daily-relays/:lbId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active Load Balancer',
          },
        ],
      })
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this load balancer',
          },
        ],
      })
    }
    const cachedMetricResponse = await getResponseFromCache(
      `${lbId}-daily-relays`
    )

    if (cachedMetricResponse) {
      return res.status(200).send(JSON.parse(cachedMetricResponse as string))
    }

    const appIds = loadBalancer.applicationIDs
    const publicKeys = await getLBPublicKeys(appIds, lbId)

    const rawDailyRelays = await influx.collectRows(
      buildDailyAppRelaysQuery({
        publicKeys,
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

    await cache.set(
      `${lbId}-daily-relays`,
      JSON.stringify(processedDailyRelaysResponse),
      'EX',
      LB_METRICS_TTL
    )

    res.status(200).send(processedDailyRelaysResponse)
  })
)

router.get(
  '/session-relays/:lbId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active Load Balancer',
          },
        ],
      })
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this load balancer',
          },
        ],
      })
    }

    const appIds = loadBalancer.applicationIDs
    const publicKeys = await getLBPublicKeys(appIds, lbId)

    const [{ _value } = { _value: 0 }] = await influx.collectRows(
      buildSessionRelaysQuery({
        publicKeys,
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

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(id)

    if (!loadBalancer) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active Load Balancer',
          },
        ],
      })
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this load balancer',
          },
        ],
      })
    }

    const appIds = loadBalancer.applicationIDs
    const publicKeys = await getLBPublicKeys(appIds, id)

    const rawLatestRelays = await influx.collectRows(
      buildLatestFilteredQueries({
        publicKeys,
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

    const { id } = req.body

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(id)

    if (!loadBalancer) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active Load Balancer',
          },
        ],
      })
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this load balancer',
          },
        ],
      })
    }

    const appIds = loadBalancer.applicationIDs
    const publicKeys = await getLBPublicKeys(appIds, id)

    const rawLatestRelays = await influx.collectRows(
      buildLatestFilteredQueries({
        publicKeys,
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

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(id)

    if (!loadBalancer) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active Load Balancer',
          },
        ],
      })
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this load balancer',
          },
        ],
      })
    }

    const appIds = loadBalancer.applicationIDs
    const publicKeys = await getLBPublicKeys(appIds, id)

    const rawLatestRelays = await influx.collectRows(
      buildLatestFilteredQueries({
        publicKeys,
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
  '/ranged-relays/:lbId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active Load Balancer',
          },
        ],
      })
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this load balancer',
          },
        ],
      })
    }

    const cachedMetricResponse = await getResponseFromCache(
      `${lbId}-ranged-relays`
    )

    if (cachedMetricResponse) {
      return res.status(200).send(JSON.parse(cachedMetricResponse as string))
    }

    const appIds = loadBalancer.applicationIDs
    const publicKeys = await getLBPublicKeys(appIds, lbId)

    const [{ _value } = { _value: 0 }] = await influx.collectRows(
      buildTotalAppRelaysQuery({
        publicKeys,
        start: '-48h',
        stop: '-24h',
      })
    )

    const processedTotalRangedRelays = {
      total_relays: _value || 0,
    }

    await cache.set(
      `${lbId}-ranged-relays`,
      JSON.stringify(processedTotalRangedRelays),
      'EX',
      LB_METRICS_TTL
    )

    res.status(200).send(processedTotalRangedRelays)
  })
)

router.get(
  '/previous-successful-relays/:lbId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active Load Balancer',
          },
        ],
      })
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this load balancer',
          },
        ],
      })
    }

    const cachedMetricResponse = await getResponseFromCache(
      `${lbId}-previous-successful-relays`
    )

    if (cachedMetricResponse) {
      return res.status(200).send(JSON.parse(cachedMetricResponse as string))
    }

    const appIds = loadBalancer.applicationIDs
    const publicKeys = await getLBPublicKeys(appIds, lbId)

    const [{ _value } = { _value: 0 }] = await influx.collectRows(
      buildSuccessfulAppRelaysQuery({
        publicKeys,
        start: '-48h',
        stop: '-24h',
      })
    )

    const processedPreviousSuccessfulRelaysResponse = {
      successful_relays: _value,
    }

    await cache.set(
      `${lbId}-previous-successful-relays`,
      JSON.stringify(processedPreviousSuccessfulRelaysResponse),
      'EX',
      LB_METRICS_TTL
    )

    res.status(200).send(processedPreviousSuccessfulRelaysResponse)
  })
)

router.get(
  '/hourly-latency/:lbId',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active Load Balancer',
          },
        ],
      })
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this load balancer',
          },
        ],
      })
    }

    const cachedMetricResponse = await getResponseFromCache(
      `${lbId}-hourly-latency`
    )

    if (cachedMetricResponse) {
      return res.status(200).send(JSON.parse(cachedMetricResponse as string))
    }

    const appIds = loadBalancer.applicationIDs
    const publicKeys = await getLBPublicKeys(appIds, lbId)

    const rawHourlyLatency = await influx.collectRows(
      buildHourlyLatencyQuery({
        publicKeys,
        start: composeHoursFromNowUtcDate(24),
        stop: '-0h',
      })
    )

    const processedHourlyLatency = rawHourlyLatency.map(
      ({ _value, _time }) => ({ bucket: _time, latency: _value ?? 0 })
    )

    const processedHourlyLatencyResponse = {
      hourly_latency: processedHourlyLatency.slice(
        processedHourlyLatency.length - 24,
        processedHourlyLatency.length
      ),
    }

    await cache.set(
      `${lbId}-hourly-latency`,
      JSON.stringify(processedHourlyLatencyResponse),
      'EX',
      LB_METRICS_TTL
    )

    res.status(200).send(processedHourlyLatencyResponse)
  })
)

router.get(
  '/origin-classification/:lbID',
  asyncMiddleware(async (req: Request, res: Response) => {
    const userId = (req.user as IUser)._id
    const { lbID } = req.params

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbID)

    if (!loadBalancer) {
      throw HttpError.BAD_REQUEST({
        errors: [
          {
            id: 'NONEXISTENT_LOADBALANCER',
            message: 'User does not have an active Load Balancer',
          },
        ],
      })
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      throw HttpError.FORBIDDEN({
        errors: [
          {
            id: 'UNAUTHORIZED_ACCESS',
            message: 'User does not have access to this load balancer',
          },
        ],
      })
    }

    const cachedMetricResponse = await getResponseFromCache(
      `${lbID}-origin-classification`
    )

    if (cachedMetricResponse) {
      return res.status(200).send(JSON.parse(cachedMetricResponse as string))
    }

    const appIds = loadBalancer.applicationIDs
    const publicKeys = await getLBPublicKeys(appIds, lbID)

    const rawOriginClassification = await influx.collectRows(
      buildOriginClassificationQuery({
        publicKeys,
        start: composeHoursFromNowUtcDate(24),
        stop: '-0h',
      })
    )

    const countByOrigin = new Map<string, number>()

    rawOriginClassification.map(({ _value, origin }) => {
      if (countByOrigin.has(origin)) {
        countByOrigin.set(origin, countByOrigin.get(origin) + _value)
      } else {
        countByOrigin.set(origin, _value)
      }
    })

    const processedOriginClassification = []

    for (const [origin, count] of countByOrigin) {
      processedOriginClassification.push({ origin, count: Math.floor(count) })
    }

    const processedOriginClassificationResponse = {
      origin_classification: processedOriginClassification.sort(
        (a, b) => b.count - a.count
      ),
    }

    await cache.set(
      `${lbID}-origin-classification`,
      JSON.stringify(processedOriginClassificationResponse),
      'EX',
      LB_METRICS_TTL
    )

    res.status(200).send(processedOriginClassificationResponse)
  })
)

export default router
