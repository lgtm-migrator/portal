import express, { Response, Request } from 'express'
import {
  ChainsResponse,
  IChain,
  NetworkDailyRelayBucket,
  NetworkDailyRelaysResponse,
  NetworkSummaryResponse,
  NetworkWeeklyAggregatedRelaysResponse,
} from '@pokt-foundation/portal-types'
import { APPLICATION_STATUSES } from '../application-statuses'
import Chain from '../models/Blockchains'
import NetworkData from '../models/NetworkData'
import ApplicationPool from '../models/PreStakedApp'
import asyncMiddleware from '../middlewares/async'
import { authenticate } from '../middlewares/passport-auth'
import { composeDaysFromNowUtcDate } from '../lib/date-utils'
import {
  buildSuccessfulNetworkRelaysQuery,
  influx,
  NETWORK_AGGREGATES_QUERY,
} from '../lib/influx'
import { cache, getResponseFromCache, NETWORK_METRICS_TTL } from '../redis'
import { KNOWN_CHAINS } from '../known-chains'

const router = express.Router()

router.use(authenticate)

/**
 * Get info for all chains.
 */
router.get(
  '/chains',
  asyncMiddleware(async (_: Request, res: Response) => {
    const chains = await Chain.find()

    const processedChains = (await Promise.all(
      chains.map(async function processChain({
        _id,
        ticker,
        network,
        description,
      }): Promise<IChain> {
        const isAvailableForStaking = await ApplicationPool.exists({
          chain: _id,
          status: APPLICATION_STATUSES.SWAPPABLE,
        })

        return {
          id: _id,
          ticker,
          network,
          description,
          isAvailableForStaking,
        }
      })
    )) as ChainsResponse

    res.status(200).send(processedChains)
  })
)

router.get(
  '/usable-chains',
  asyncMiddleware(async (_: Request, res: Response) => {
    const chains = await Chain.find()
    const knownChains = Object.values(KNOWN_CHAINS)
    const serviceableChains = chains.filter((c) =>
      knownChains.find((chain) => {
        if (c._id === chain.id) {
          return true
        }
        return false
      })
    )
    const formattedChains = serviceableChains.map(function processChain({
      _id,
      appCount,
      description,
      network,
      ticker,
    }): IChain {
      return {
        appCount,
        description,
        id: _id,
        isAvailableForStaking: true,
        network,
        ticker,
      }
    }) as ChainsResponse

    res.status(200).send(formattedChains)
  })
)

router.get(
  '/summary',
  asyncMiddleware(async (_: Request, res: Response) => {
    const latestNetworkData = await NetworkData.findOne(
      {},
      {},
      { sort: { createdAt: -1 } }
    )

    res.status(200).send({
      appsStaked: 2000,
      nodesStaked: Number(latestNetworkData.nodesStaked),
      poktStaked: Number(latestNetworkData.poktStaked),
    } as NetworkSummaryResponse)
  })
)

router.get(
  '/daily-relays',
  asyncMiddleware(async (_: Request, res: Response) => {
    const cachedResponse = await getResponseFromCache('network-daily-relays')

    if (cachedResponse) {
      return res.status(200).send(JSON.parse(cachedResponse as string))
    }

    const rawDailyRelays = await influx.collectRows(
      buildSuccessfulNetworkRelaysQuery({
        start: composeDaysFromNowUtcDate(8),
        stop: composeDaysFromNowUtcDate(1),
      })
    )

    const processedDailyRelaysResponse = rawDailyRelays.map(
      ({ _time, _value }) =>
        ({
          total_relays: _value ?? 0,
          bucket: _time,
        } as NetworkDailyRelayBucket)
    ) as NetworkDailyRelaysResponse

    await cache.set(
      'network-daily-relays',
      JSON.stringify(processedDailyRelaysResponse),
      'EX',
      NETWORK_METRICS_TTL
    )

    res.status(200).send(processedDailyRelaysResponse)
  })
)

router.get(
  '/weekly-aggregate-stats',
  asyncMiddleware(async (_: Request, res: Response) => {
    const cachedResponse = await getResponseFromCache('weekly-aggregate-stats')

    if (cachedResponse) {
      return res.status(200).send(JSON.parse(cachedResponse as string))
    }

    const [{ success, total }] = await influx.collectRows(
      NETWORK_AGGREGATES_QUERY
    )

    const processedAggregateStatsResponse = {
      successful_relays: success,
      total_relays: total,
    } as NetworkWeeklyAggregatedRelaysResponse

    await cache.set(
      'weekly-aggregate-stats',
      JSON.stringify(processedAggregateStatsResponse),
      'EX',
      NETWORK_METRICS_TTL
    )

    res.status(200).send(processedAggregateStatsResponse)
  })
)

export default router
