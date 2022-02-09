import express, { Response, Request, NextFunction } from 'express'
import crypto from 'crypto'
import { Encryptor } from 'strong-cryptor'
import {
  UserLBDailyRelaysResponse,
  UserLBErrorMetricsResponse,
  UserLBHistoricalLatencyResponse,
  UserLBHistoricalOriginFrequencyResponse,
  UserLBLatencyBucket,
  UserLBOnChainDataResponse,
  UserLBPreviousTotalRelaysResponse,
  UserLBPreviousTotalSuccessfulRelaysResponse,
  UserLBSessionRelaysResponse,
  UserLBTotalRelaysResponse,
  UserLBTotalSuccessfulRelaysResponse,
} from '@pokt-foundation/portal-types'
import { typeGuard, QueryAppResponse, PocketAAT } from '@pokt-network/pocket-js'
import { IAppInfo, GetApplicationQuery } from './types'
import { cache, getResponseFromCache, LB_METRICS_TTL } from '../redis'
import env, { PocketNetworkKeys } from '../environment'
import asyncMiddleware from '../middlewares/async'
import { authenticate } from '../middlewares/passport-auth'
import Application, { IApplication } from '../models/Application'
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
  buildSessionRelaysQuery,
  buildSuccessfulAppRelaysQuery,
  buildTotalAppRelaysQuery,
  buildOriginClassificationQuery,
} from '../lib/influx'
import { getApp, createPocketAccount, PocketAccount } from '../lib/pocket'
import HttpError from '../errors/http-error'
import MailgunService from '../services/MailgunService'
import { APPLICATION_STATUSES } from '../application-statuses'
import axios from 'axios'

const DEFAULT_GATEWAY_SETTINGS = {
  secretKey: '',
  secretKeyRequired: false,
  whitelistOrigins: [],
  whitelistUserAgents: [],
}
const DEFAULT_TIMEOUT = 2000
const DEFAULT_MAX_RELAYS = 42000
const MAX_USER_ENDPOINTS = 2

const CRYPTO_KEY = env('DATABASE_ENCRYPTION_KEY') as string

const encryptor = new Encryptor({ key: CRYPTO_KEY })

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

async function getAppChain(address: string): Promise<string> {
  const onChainApp = ((await getApp(address)) as QueryAppResponse).toJSON()

  const { chains } = onChainApp

  if (!chains) {
    return 'NOT_FOUND'
  }

  const [chain] = chains

  return chain
}

const router = express.Router()

router.use(authenticate)

router.get(
  '',
  asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    const id = (req.user as IUser)._id
    const lbs = await LoadBalancer.find({
      user: id,
    })

    if (!lbs) {
      return next(
        HttpError.NOT_FOUND({
          errors: [
            {
              id: 'NONEXISTENT_APPLICATION',
              message: 'User does not have an active application',
            },
          ],
        })
      )
    }

    // Process all the LBs to "clean them up" for the interface.
    const processedLbs = await Promise.all(
      lbs.map(async (lb) => {
        if (!lb.applicationIDs.length) {
          // Remove user association with empty LBs. This means their apps have no usage and have been removed, so this LB should be removed (and will be done so automatically after some time).
          lb.user = null
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

        for (const appId of cleanedApplicationIDs) {
          const app = await Application.findById(appId)

          apps.push({
            appId: app._id.toString(),
            address: app.freeTierApplicationAccount.address,
            publicKey: app.freeTierApplicationAccount.publicKey,
          })
        }

        const app = await Application.findById(lb.applicationIDs[0])

        const chain = lb.gigastakeRedirect
          ? ''
          : await getAppChain(app.freeTierApplicationAccount.address)

        if (chain === 'NOT_FOUND') {
          return
        }
        app.chain = chain

        const processedLb: GetApplicationQuery = {
          apps,
          chain: chain,
          createdAt: new Date(Date.now()),
          updatedAt: lb.updatedAt,
          gigastake: lb.gigastakeRedirect,
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
  asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    const { name, gatewaySettings = DEFAULT_GATEWAY_SETTINGS } = req.body

    const id = (req.user as IUser)._id
    const userLBs = await LoadBalancer.find({ user: id })

    const isNewAppRequestInvalid =
      userLBs.length >= MAX_USER_ENDPOINTS &&
      !(env('GODMODE_ACCOUNTS') as string[]).includes(id.toString())

    if (isNewAppRequestInvalid) {
      return next(
        HttpError.BAD_REQUEST({
          errors: [
            {
              id: 'ALREADY_EXISTING',
              message: 'User has reached their free app limit.',
            },
          ],
        })
      )
    }

    const rawAccount = (await createPocketAccount()) as unknown as PocketAccount

    const encryptedPocketAccount: PocketAccount = {
      address: rawAccount.address,
      publicKey: rawAccount.publicKey,
      privateKey: encryptor.encrypt(rawAccount.privateKey),
      passPhrase: rawAccount.passPhrase,
    }

    const freeTierAAT = await PocketAAT.from(
      '0.0.1',
      (env('POCKET_NETWORK') as PocketNetworkKeys).clientPubKey,
      rawAccount.publicKey,
      rawAccount.privateKey
    )

    const completeGatewaySettings = {
      ...gatewaySettings,
      secretKey: crypto.randomBytes(16).toString('hex'),
    }

    const application = new Application({
      // We enforce every app to be treated as a free-tier app for now.
      dummy: true,
      freeTier: true,
      freeTierApplicationAccount: encryptedPocketAccount,
      gatewayAAT: freeTierAAT,
      lastChangedStatusAt: new Date(Date.now()),
      maxRelays: DEFAULT_MAX_RELAYS,
      name,
      status: APPLICATION_STATUSES.IN_SERVICE,
      user: id,
      gatewaySettings: {
        ...completeGatewaySettings,
      },
      notificationSettings: {
        signedUp: false,
        quarter: false,
        half: false,
        threeQuarters: true,
        full: true,
      },
    })

    await application.save()

    const loadBalancer: ILoadBalancer = new LoadBalancer({
      user: id,
      name,
      requestTimeOut: DEFAULT_TIMEOUT,
      applicationIDs: [application._id.toString()],
      gigastakeRedirect: true,
      updatedAt: new Date(Date.now()),
      createdAt: new Date(Date.now()),
    })

    await loadBalancer.save()

    const processedLb: GetApplicationQuery = {
      chain: '',
      createdAt: new Date(Date.now()),
      updatedAt: loadBalancer.updatedAt,
      name: loadBalancer.name,
      id: loadBalancer._id.toString(),
      freeTier: true,
      gigastake: true,
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
  asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    const { gatewaySettings } = req.body
    const { lbId } = req.params
    const userId = (req.user as IUser)._id

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      return next(
        HttpError.BAD_REQUEST({
          errors: [
            { id: 'NONEXISTENT_APPLICATION', message: 'Application not found' },
          ],
        })
      )
    }

    if (loadBalancer.user.toString() !== userId.toString()) {
      return next(
        HttpError.BAD_REQUEST({
          errors: [
            {
              id: 'UNAUTHORIZED_ACCESS',
              message: 'Application does not belong to user',
            },
          ],
        })
      )
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
  asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params
    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      return next(
        HttpError.BAD_REQUEST({
          errors: [
            { id: 'NONEXISTENT_APPLICATION', message: 'Application not found' },
          ],
        })
      )
    }

    if (loadBalancer.user.toString() !== userId.toString()) {
      return next(
        HttpError.BAD_REQUEST({
          errors: [
            {
              id: 'UNAUTHORIZED_ACCESS',
              message: 'Application does not belong to user',
            },
          ],
        })
      )
    }

    const dbApps = await Promise.all(
      loadBalancer.applicationIDs.map(async function getApps(applicationId) {
        const application: IApplication = await Application.findById(
          applicationId
        )

        return application
      })
    )

    if (loadBalancer.gigastakeRedirect) {
      const appsStatus = dbApps.reduce(
        (status, app) => {
          return {
            stake: 0,
            relays: status.relays + app.maxRelays,
          }
        },
        { stake: 0, relays: 0 }
      ) as UserLBOnChainDataResponse
      res.status(200).send(appsStatus)
    }

    const apps = await Promise.all(
      dbApps.map(async function getAppsFromChain(app) {
        return await getApp(app.freeTierApplicationAccount.address)
      })
    )

    const isAppResponseOk = apps.reduce(
      (ok, app) => ok || typeGuard(app, QueryAppResponse),
      true
    )

    if (!isAppResponseOk) {
      return next(
        HttpError.INTERNAL_SERVER_ERROR({
          errors: [
            {
              id: 'POCKET_JS_ERROR',
              message: 'Application could not be fetched.',
            },
          ],
        })
      )
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
    ) as UserLBOnChainDataResponse

    res.status(200).send(appsStatus)
  })
)

router.put(
  '/notifications/:lbId',
  asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params
    const { quarter, half, threeQuarters, full } = req.body
    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      return next(
        HttpError.BAD_REQUEST({
          errors: [
            { id: 'NONEXISTENT_APPLICATION', message: 'Application not found' },
          ],
        })
      )
    }

    if (loadBalancer.user.toString() !== userId.toString()) {
      return next(
        HttpError.BAD_REQUEST({
          errors: [
            {
              id: 'UNAUTHORIZED_ACCESS',
              message: 'Application does not belong to user',
            },
          ],
        })
      )
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
  '/remove/:lbId',
  asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params
    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      return next(
        HttpError.BAD_REQUEST({
          errors: [
            { id: 'NONEXISTENT_APPLICATION', message: 'Application not found' },
          ],
        })
      )
    }

    if (loadBalancer.user.toString() !== userId.toString()) {
      return next(
        HttpError.BAD_REQUEST({
          errors: [
            {
              id: 'UNAUTHORIZED_ACCESS',
              message: 'Application does not belong to user',
            },
          ],
        })
      )
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
  asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      return next(
        HttpError.BAD_REQUEST({
          errors: [
            {
              id: 'NONEXISTENT_LOADBALANCER',
              message: 'User does not have an active Load Balancer',
            },
          ],
        })
      )
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      return next(
        HttpError.FORBIDDEN({
          errors: [
            {
              id: 'UNAUTHORIZED_ACCESS',
              message: 'User does not have access to this load balancer',
            },
          ],
        })
      )
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
    } as UserLBTotalRelaysResponse

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
  asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      return next(
        HttpError.BAD_REQUEST({
          errors: [
            {
              id: 'NONEXISTENT_LOADBALANCER',
              message: 'User does not have an active Load Balancer',
            },
          ],
        })
      )
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      return next(
        HttpError.FORBIDDEN({
          errors: [
            {
              id: 'UNAUTHORIZED_ACCESS',
              message: 'User does not have access to this load balancer',
            },
          ],
        })
      )
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
      successful_relays: _value || 0,
    } as UserLBTotalSuccessfulRelaysResponse

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
  asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      return next(
        HttpError.BAD_REQUEST({
          errors: [
            {
              id: 'NONEXISTENT_LOADBALANCER',
              message: 'User does not have an active Load Balancer',
            },
          ],
        })
      )
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      return next(
        HttpError.FORBIDDEN({
          errors: [
            {
              id: 'UNAUTHORIZED_ACCESS',
              message: 'User does not have access to this load balancer',
            },
          ],
        })
      )
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
          daily_relays: _value ?? 0,
        }
      }
    )

    const processedDailyRelaysResponse = {
      daily_relays: processedDailyRelays,
    } as UserLBDailyRelaysResponse

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
  asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      return next(
        HttpError.BAD_REQUEST({
          errors: [
            {
              id: 'NONEXISTENT_LOADBALANCER',
              message: 'User does not have an active Load Balancer',
            },
          ],
        })
      )
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      return next(
        HttpError.FORBIDDEN({
          errors: [
            {
              id: 'UNAUTHORIZED_ACCESS',
              message: 'User does not have access to this load balancer',
            },
          ],
        })
      )
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
    } as UserLBSessionRelaysResponse)
  })
)

router.get(
  '/previous-total-relays/:lbId',
  asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      return next(
        HttpError.BAD_REQUEST({
          errors: [
            {
              id: 'NONEXISTENT_LOADBALANCER',
              message: 'User does not have an active Load Balancer',
            },
          ],
        })
      )
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      return next(
        HttpError.FORBIDDEN({
          errors: [
            {
              id: 'UNAUTHORIZED_ACCESS',
              message: 'User does not have access to this load balancer',
            },
          ],
        })
      )
    }

    const cachedMetricResponse = await getResponseFromCache(
      `${lbId}-previous-total-relays`
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
    } as UserLBPreviousTotalRelaysResponse

    await cache.set(
      `${lbId}-previous-total-relays`,
      JSON.stringify(processedTotalRangedRelays),
      'EX',
      LB_METRICS_TTL
    )

    res.status(200).send(processedTotalRangedRelays)
  })
)

router.get(
  '/previous-successful-relays/:lbId',
  asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      return next(
        HttpError.BAD_REQUEST({
          errors: [
            {
              id: 'NONEXISTENT_LOADBALANCER',
              message: 'User does not have an active Load Balancer',
            },
          ],
        })
      )
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      return next(
        HttpError.FORBIDDEN({
          errors: [
            {
              id: 'UNAUTHORIZED_ACCESS',
              message: 'User does not have access to this load balancer',
            },
          ],
        })
      )
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
    } as UserLBPreviousTotalSuccessfulRelaysResponse

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
  asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)._id
    const { lbId } = req.params

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbId)

    if (!loadBalancer) {
      return next(
        HttpError.BAD_REQUEST({
          errors: [
            {
              id: 'NONEXISTENT_LOADBALANCER',
              message: 'User does not have an active Load Balancer',
            },
          ],
        })
      )
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      return next(
        HttpError.FORBIDDEN({
          errors: [
            {
              id: 'UNAUTHORIZED_ACCESS',
              message: 'User does not have access to this load balancer',
            },
          ],
        })
      )
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
    ) as UserLBLatencyBucket[]

    const processedHourlyLatencyResponse = {
      hourly_latency: processedHourlyLatency.slice(
        processedHourlyLatency.length - 24,
        processedHourlyLatency.length
      ),
    } as UserLBHistoricalLatencyResponse

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
  asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)._id
    const { lbID } = req.params

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbID)

    if (!loadBalancer) {
      return next(
        HttpError.BAD_REQUEST({
          errors: [
            {
              id: 'NONEXISTENT_LOADBALANCER',
              message: 'User does not have an active Load Balancer',
            },
          ],
        })
      )
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      return next(
        HttpError.FORBIDDEN({
          errors: [
            {
              id: 'UNAUTHORIZED_ACCESS',
              message: 'User does not have access to this load balancer',
            },
          ],
        })
      )
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
    } as UserLBHistoricalOriginFrequencyResponse

    await cache.set(
      `${lbID}-origin-classification`,
      JSON.stringify(processedOriginClassificationResponse),
      'EX',
      LB_METRICS_TTL
    )

    res.status(200).send(processedOriginClassificationResponse)
  })
)

router.get(
  '/error-metrics/:lbID',
  asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as IUser)._id
    const { lbID } = req.params

    const loadBalancer: ILoadBalancer = await LoadBalancer.findById(lbID)

    if (!loadBalancer) {
      return next(
        HttpError.BAD_REQUEST({
          errors: [
            {
              id: 'NONEXISTENT_LOADBALANCER',
              message: 'User does not have an active Load Balancer',
            },
          ],
        })
      )
    }
    if (loadBalancer.user.toString() !== userId.toString()) {
      return next(
        HttpError.FORBIDDEN({
          errors: [
            {
              id: 'UNAUTHORIZED_ACCESS',
              message: 'User does not have access to this load balancer',
            },
          ],
        })
      )
    }

    const appIds = loadBalancer.applicationIDs
    const publicKeys = await getLBPublicKeys(appIds, lbID)

    const metricsURL = `${env('ERROR_METRICS_URL')}/error?or=(${publicKeys
      .map((pk: string) => `applicationpublickey.eq.${pk}`)
      .join(
        ','
      )})&limit=50&order=timestamp.desc&or=(method.neq.synccheck,method.neq.checks)`

    const { data: metrics } = await axios.get(metricsURL)

    res.status(200).send(metrics as UserLBErrorMetricsResponse)
  })
)

export default router
