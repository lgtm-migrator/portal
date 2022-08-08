import { notifyUsage } from './notifications'
import { registerAnalytics } from './analytics'

import { SIXTY_MINUTES_OFFSET } from './utils'
import { WorkerContext } from './index'

/**
 * Holds the workers configuration.
 */
export const workers = [
  {
    name: 'NOTIFICATION_WORKER',
    color: 'red',
    workerFn: (ctx: WorkerContext): Promise<void> => notifyUsage(ctx),
    recurrence: SIXTY_MINUTES_OFFSET,
  },
  {
    name: 'ANALYTICS_WORKER',
    color: 'green',
    workerFn: (ctx: WorkerContext): Promise<void> => registerAnalytics(ctx),
    recurrence: SIXTY_MINUTES_OFFSET,
  },
]
