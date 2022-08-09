import axios from 'axios'
import * as Amplitude from '@amplitude/node'

import env from '../environment'
import { WorkerContext } from './index'
import { dayjs } from '../lib/date-utils'
import { influx, buildAnalyticsQuery } from '../lib/influx'
import { splitAuth0ID } from '../lib/split-auth0-id'
import Application from '../models/Application'
import LoadBalancer from '../models/LoadBalancer'

interface IUserProfile {
  email: string
  endpointIds: string[]
  endpointNames: string[]
  numberOfEndpoints: number
  publicKeys: string[]
  publicKeysPerEndpoint: number[]
}

interface Auth0TokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

interface Auth0UserResponse {
  email: string
  user_metadata: { legacy?: boolean; admin?: boolean }
  user_id: string
}

interface IAuth0User {
  email: string
  id: string
  legacy: boolean
  auth0: boolean
}

interface IRelayMetricUpdate {
  amount: number
  chainID: string
  endpointID: string
  endpointName: string
  endpointPublicKeys: string[]
}

interface UsageByID {
  chain: string
  usage: number
}

interface UserProfileUpdate {
  userProfile: IUserProfile
  metricUpdates: IRelayMetricUpdate[]
}

const DEFAULT_USER_PROFILE = {
  email: '',
  endpointIds: [],
  endpointNames: [],
  numberOfEndpoints: 0,
  publicKeys: [],
  publicKeysPerEndpoint: [],
} as IUserProfile

const ORPHANED_KEY = 'ORPHANED'

// This is the main analytics function called by the analytics worker
export async function registerAnalytics(ctx: WorkerContext): Promise<void> {
  const apps = await fetchUsedApps(ctx)

  const userProfiles = await mapUsageToProfiles(apps, ctx)

  await sendRelayCountToAmplitude({ ctx, userProfiles })
}

async function getAuth0Token(ctx: WorkerContext): Promise<string> {
  try {
    const url = env('AUTH0_AUTH_URL')

    const {
      data: { access_token },
    } = await axios.post<Auth0TokenResponse>(
      url,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: env('AUTH0_CLIENT_ID'),
        client_secret: env('AUTH0_CLIENT_SECRET'),
        audience: env('AUTH0_AUDIENCE'),
      }),
      { headers: { 'content-type': 'application/x-www-form-urlencoded' } }
    )

    return access_token
  } catch (error) {
    ctx.logger.error(
      `[AMPLITUDE] Error fetching token from Auth0: ${error?.message}`
    )
  }
}

async function fetchUserFromAuth0(
  userId: string,
  token: string,
  ctx: WorkerContext
): Promise<IAuth0User | null> {
  const url = env('AUTH0_AUDIENCE'),
    path = 'users',
    params = `?q=user_id:*${userId}&fields=user_id,email,user_metadata&include_fields=true`,
    fullRequestPath = `${url}${path}${params}`

  try {
    const { data } = await axios.get<Auth0UserResponse[]>(fullRequestPath, {
      headers: { authorization: `Bearer ${token}` },
    })
    const [userResponse] = data

    return userResponse
      ? ({
          id: splitAuth0ID(userResponse.user_id),
          email: userResponse.email,
          legacy: userResponse.user_metadata?.legacy ?? false,
          auth0: true,
        } as IAuth0User)
      : null
  } catch (err) {
    ctx.logger.error(
      `[AMPLITUDE] Error fetching user from Auth0: ${err?.message}`
    )
    return null
  }
}

export async function fetchUsedApps(
  ctx: WorkerContext
): Promise<Map<string, UsageByID[]>> {
  const currentHour = dayjs().utc().hour()
  const start = dayjs()
    .utc()
    .hour(currentHour)
    .minute(0)
    .second(0)
    .millisecond(0)
    .subtract(2, 'hour')
    .toISOString()
  const stop = dayjs()
    .utc()
    .hour(currentHour)
    .minute(0)
    .second(0)
    .millisecond(0)
    .subtract(1, 'hour')
    .toISOString()

  const rawAppsUsed = await influx.collectRows<{
    _value: number
    applicationPublicKey: string
    blockchain: string
  }>(
    buildAnalyticsQuery({
      start,
      stop,
    })
  )

  const appsUsed = new Map<string, number>()

  let totalEndpointUsage = 0

  rawAppsUsed.map(({ _value, applicationPublicKey, blockchain }) => {
    const publicKeyChainID = `${applicationPublicKey}-${blockchain}`
    const total = appsUsed.get(publicKeyChainID) ?? 0
    appsUsed.set(publicKeyChainID, total + _value)
    totalEndpointUsage += _value
  })

  ctx.logger.info(
    `[AMPLITUDE] Got ${rawAppsUsed.length} apps used with a total usage of ${totalEndpointUsage}`
  )

  const appsUsedByChain = new Map<string, UsageByID[]>()

  totalEndpointUsage = 0

  for (const [applicationPublicKeyWithChain, usage] of appsUsed.entries()) {
    const [applicationPublicKey, chainID] =
      applicationPublicKeyWithChain.split('-')
    const usageByChain = appsUsedByChain.get(applicationPublicKey) ?? []

    usageByChain.push({ chain: chainID, usage })
    appsUsedByChain.set(applicationPublicKey, usageByChain)

    // Sum total endpoint usage for accounting purposes
    totalEndpointUsage += usage
  }

  ctx.logger.info(
    `[AMPLITUDE] Got ${rawAppsUsed.length} apps used with a total usage of ${totalEndpointUsage}`
  )
  return appsUsedByChain
}

// mapUsageToProfiles gets the apps used by chain,
// finds their parent lb (or app if no lb is found),
// finds their parent user,
// and builds the relay metric update and the complete user property profile for the
// particular user
export async function mapUsageToProfiles(
  appsUsedByChain: Map<string, UsageByID[]>,
  ctx: WorkerContext
): Promise<
  Map<
    string,
    { userProfile: IUserProfile; metricUpdates: IRelayMetricUpdate[] }
  >
> {
  // TODO
  const dbApps = await Application.find()
  const dbLBs = await LoadBalancer.find()
  const userProfiles = new Map<string, UserProfileUpdate>()

  const auth0Token = await getAuth0Token(ctx)

  let totalUsageProcessed = 0
  for (const [publicKey, usageByChain] of appsUsedByChain.entries()) {
    const app = dbApps.find(
      (application) =>
        application?.freeTierApplicationAccount?.publicKey === publicKey ||
        application?.gatewayAAT?.applicationPublicKey === publicKey
    )

    const totalUsage = usageByChain.reduce(
      (total, usageByID) => total + usageByID.usage,
      0
    )

    // If the public key doesn't match to any app, just skip it. While this should probably not happen,
    // it's best to log a warning if it does and bail.
    if (!app) {
      ctx.logger.error(
        `[AMPLITUDE] No app found for public key ${publicKey} but presents an usage of ${totalUsage}.`
      )

      continue
    }

    // If there's at least an app, we have two options:
    // - Categorize it as an app without an LB associated with it.
    // We'll assume all of these apps are "orphaned", as they are very old endpoints that cannot
    // be accessed through the portal UI anymore unless they're coupled with an LB
    // - Find their LB, and associate the LB with the app.
    // When doing this
    const lb = dbLBs.find((lb) =>
      lb.applicationIDs.find((id) => id === app?._id?.toString())
    )

    // Option 1:
    // No LB found, so this app is considered orphaned.
    // It has usage so it must be counted.
    if (!lb) {
      ctx.logger.warn(
        `[AMPLITUDE] No LB found for app ${app._id?.toString()} [${
          app.name
        }], but presents usage ${totalUsage}. Categorizing as "orphaned" app.`
      )

      // as this is the orphaned apps profile, get it with the orphan app key
      const { userProfile = DEFAULT_USER_PROFILE, metricUpdates = [] } =
        userProfiles.get(ORPHANED_KEY) ?? {
          userProfile: DEFAULT_USER_PROFILE,
          metricUpdates: [],
        }

      // Build the updated user profile
      const updatedUserProfile = {
        ...userProfile,
        email: ORPHANED_KEY,
        endpointIds: [...userProfile.endpointIds, app._id?.toString() ?? ''],
        endpointNames: [...userProfile.endpointNames, app?.name ?? ''],
        numberOfEndpoints: userProfile.numberOfEndpoints + 1,
        publicKeys: [...userProfile.publicKeys, publicKey],
        // We know this is one as it's only 1 public key per app
        publicKeysPerEndpoint: [...userProfile.publicKeysPerEndpoint, 1],
      } as IUserProfile

      // Build the updated metric relay update
      const newMetricUpdates = usageByChain.map((usagePerChain) => {
        totalUsageProcessed += usagePerChain.usage

        return {
          amount: usagePerChain.usage,
          chainID: usagePerChain.chain,
          endpointID: app._id?.toString(),
          endpointName: app.name,
          endpointPublicKeys: [publicKey],
        } as IRelayMetricUpdate
      })

      // Append the new metric updates
      const updatedMetricUpdates = [...metricUpdates, ...newMetricUpdates]

      userProfiles.set(ORPHANED_KEY, {
        userProfile: updatedUserProfile,
        metricUpdates: updatedMetricUpdates,
      })
      // Option 2: LB was found, so we'll try to associate it to an user
      // and count its usage.
    } else {
      // Always fetch users from Auth0. Legacy users retain their old BSON ID in the Auth0 DB,
      // and new users will be instatly found on the Auth0 DB, which means we don't have to query
      // the old MongoDB for users anymore.
      // If we don't have a user, the we'll set `user` as null and register the usage as an orphaned LB.
      const userID = lb?.user ?? ''
      const user = userID
        ? await fetchUserFromAuth0(userID, auth0Token, ctx)
        : null
      const userKey = user?.id || ORPHANED_KEY

      if (!user) {
        ctx.logger.warn(
          `[AMPLITUDE] ${lb._id?.toString()} [${
            lb.name
          }] has usage ${totalUsage} but is not associated with any user.`
        )
      }

      // Get the current endpoints from this user. Will just be an empty array if there's no user.
      const userEndpoints = dbLBs.filter((lb) => lb?.user === userID) ?? []

      // Get all the apps in this loadbalancer.
      const currentEndpointApps =
        lb.applicationIDs
          .map((id) =>
            dbApps.find((app) => app._id?.toString() === id?.toString())
          )
          .filter((id) => id) ?? []

      // get the lb user profile
      const { userProfile = DEFAULT_USER_PROFILE, metricUpdates = [] } =
        userProfiles.get(userKey) ?? {
          userProfile: DEFAULT_USER_PROFILE,
          metricUpdates: [],
        }

      // Build the updated user profile
      const updatedUserProfile = {
        ...userProfile,
        email: user ? user.email : ORPHANED_KEY,
        endpointIds: [...userProfile.endpointIds, lb._id?.toString() ?? ''],
        endpointNames: [...userProfile.endpointNames, lb?.name ?? ''],
        numberOfEndpoints: user
          ? // Either the amount of user endpoints we found (or 1 if we didn't find one for some reason)
            userEndpoints.length || 1
          : // Or just the current number of endpoints plus this one (the orphaned case)
            userProfile.numberOfEndpoints + 1,
        publicKeys: [
          ...userProfile.publicKeys,
          // Get all the public keys from the apps from this lb
          ...currentEndpointApps.map(
            (app) =>
              app?.freeTierApplicationAccount.publicKey ||
              app?.gatewayAAT.applicationPublicKey
          ),
        ],
        // We add the amount of individual apps this endpoint has (1 app = 1 pubkey)
        publicKeysPerEndpoint: [
          ...userProfile.publicKeysPerEndpoint,
          lb.applicationIDs.length,
        ],
      } as IUserProfile

      // Build the updated metric relay updates
      const newMetricUpdates = usageByChain.map((usagePerChain) => {
        totalUsageProcessed += usagePerChain.usage

        return {
          amount: usagePerChain.usage,
          chainID: usagePerChain.chain,
          endpointID: lb._id?.toString(),
          endpointName: lb.name,
          endpointPublicKeys: currentEndpointApps.map(
            (app) =>
              app?.freeTierApplicationAccount.publicKey ||
              app?.gatewayAAT.applicationPublicKey ||
              ''
          ),
        } as IRelayMetricUpdate
      })

      const updatedMetricUpdates = [...metricUpdates, ...newMetricUpdates]

      userProfiles.set(userKey, {
        userProfile: updatedUserProfile,
        metricUpdates: updatedMetricUpdates,
      })
    }
  }

  ctx.logger.info(`[AMPLITUDE] Processed ${totalUsageProcessed} usage`)

  return userProfiles
}

export async function sendRelayCountToAmplitude({
  userProfiles,
  ctx,
}: {
  userProfiles: Map<
    string,
    { userProfile: IUserProfile; metricUpdates: IRelayMetricUpdate[] }
  >
  ctx: WorkerContext
}): Promise<void> {
  let totalUsage = 0
  const amplitudeClient = Amplitude.init(env('AMPLITUDE_API_KEY'))

  for (const [
    userID,
    { userProfile, metricUpdates },
  ] of userProfiles.entries()) {
    for (const metricUpdate of metricUpdates) {
      await amplitudeClient.logEvent({
        event_type: 'RELAY_METRIC_UPDATE',
        user_id: userID,
        event_properties: { ...metricUpdate },
        user_properties: {
          ...userProfile,
        },
      })
      totalUsage += metricUpdate.amount
    }
    await amplitudeClient.flush()
  }

  ctx.logger.info(
    `[AMPLITUDE] LOGGED ${userProfiles.size} users, with total usage ${totalUsage}`
  )
}
