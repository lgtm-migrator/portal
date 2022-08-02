import winston from 'winston'
import WinstonCloudWatch from 'winston-cloudwatch'
import env from '../environment'
import { getUTCTimestamp } from './date-utils'

export interface notificationLog {
  workerName: string
  appID: string
  kind: 'notificationLog'
  usage: number
  limit: number
}
export interface txLog {
  workerName: string
  account: string
  amount?: string
  chain?: string
  kind: 'txLog'
  status: string
  txHash?: string
  type:
    | 'transfer'
    | 'stake'
    | 'slot_stake'
    | 'unstake'
    | 'removal'
    | 'mark_for_removal'
    | 'prestakepool_move'
    | 'log'
    | 'tx_issue'
}

const { createLogger, format, transports } = winston

const logFormat = format.combine(
  format.colorize(),
  format.simple(),
  format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  })
)

const logger = createLogger({
  transports: [
    new transports.Console({
      level: 'debug',
      handleExceptions: true,
      format: logFormat,
    }),
  ],
})

if (env('PROD')) {
  logger.add(
    new WinstonCloudWatch({
      name: 'dashboard-mainnet-backend',
      logGroupName: env('CLOUDWATCH_GROUP_NAME'),
      logStreamName: env('CLOUDWATCH_GROUP_NAME'),
      awsAccessKeyId: env('CLOUDWATCH_ACCESS_KEY'),
      awsSecretKey: env('CLOUDWATCH_SECRET_KEY'),
      awsRegion: env('CLOUDWATCH_REGION'),
      jsonMessage: true,
      level: 'verbose',
      messageFormatter: (logObject: txLog | unknown) => {
        if (!logObject.hasOwnProperty('kind')) {
          return JSON.stringify(logObject)
        }

        return JSON.stringify({
          timestamp: getUTCTimestamp(),
          ...(logObject as txLog),
        })
      },
    })
  )
}
export { logger }
