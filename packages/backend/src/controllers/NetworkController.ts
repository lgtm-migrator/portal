import express, { Response, Request } from 'express'
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

const router = express.Router()

router.use(authenticate)

/**
 * Get info for all chains.
 */
router.get(
  '/chains',
  asyncMiddleware(async (_: Request, res: Response) => {
    const chains = await Chain.find()

    const processedChains = await Promise.all(
      chains.map(async function processChain({
        _id,
        ticker,
        network,
        description,
        nodeCount,
      }) {
        const isAvailableForStaking = await ApplicationPool.exists({
          chain: _id,
          status: APPLICATION_STATUSES.SWAPPABLE,
        })

        return {
          id: _id,
          ticker,
          network,
          description,
          nodeCount,
          isAvailableForStaking,
        }
      })
    )

    res.status(200).send({ chains: processedChains })
  })
)

router.get(
  '/stakeable-chains',
  asyncMiddleware(async (_: Request, res: Response) => {
    const chains = await Chain.find()
    const existentChains = await Promise.all(
      chains.map(async function filterChain({ _id }) {
        const exists = await ApplicationPool.exists({
          chain: _id,
          status: APPLICATION_STATUSES.SWAPPABLE,
        })

        return exists
      })
    )
    const processedChains = chains.filter((_, i) => existentChains[i])
    const formattedChains = processedChains.map(function processChain({
      _id,
      appCount,
      description,
      network,
      nodeCount,
      ticker,
    }) {
      return {
        appCount,
        description,
        id: _id,
        isAvailableForStaking: true,
        network,
        nodeCount,
        ticker,
      }
    })

    res.status(200).send({ chains: formattedChains })
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
      summary: {
        appsStaked: 2000,
        nodesStaked: latestNetworkData.nodesStaked,
        poktStaked: latestNetworkData.poktStaked,
      },
    })
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
      ({ _time, _value }) => ({ total_relays: _value ?? 0, bucket: _time })
    )

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
    }

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
