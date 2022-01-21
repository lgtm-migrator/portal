import { notifyUsage } from './notifications'

import {
  SIXTY_MINUTES_OFFSET,
} from './utils'

/**
 * Holds the workers configuration.
 */
export const workers = [
  {
    name: 'NOTIFICATION_WORKER',
    color: 'red',
    workerFn: (ctx): Promise<void> => notifyUsage(ctx),
    recurrence: SIXTY_MINUTES_OFFSET,
  },
]
