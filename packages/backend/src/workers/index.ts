import cron from 'node-cron'
import { logger } from '../lib/logger'
import { workers } from './config'

const ONE_SECOND = 1000

export function startWorkers(): void {
  for (const { name, color, workerFn, recurrence } of workers) {
    cron.schedule(recurrence, async function handleWorkerProcess() {
      const startTime = Date.now()
      let endTime: number
      const startInUtc = new Date(startTime).toUTCString()

      logger.info(
        `[portal-workers]: Starting worker "${name}" at ${startInUtc} with color ${color}`
      )

      try {
        await workerFn({ logger, name })

        endTime = Date.now()
        const endInUtc = new Date(endTime).toUTCString()
        const elapsedTime = (endTime - startTime) / ONE_SECOND

        logger.info(
          `[portal-workers] Worker ${name} exited successfully at ${endInUtc}, took ${elapsedTime} seconds`
        )
      } catch (err) {
        logger.error(`Worker ${name} exited with an error.`, {
          error: err.message,
        })
        // TODO: Send metrics to sentry
        logger.error(err.message)
      }
    })
  }
}
