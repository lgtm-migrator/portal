import winston from 'winston'
import WinstonCloudWatch from 'winston-cloudwatch'
import env from '../environment'
import { getUTCTimestamp } from './date-utils'

export interface txLog {
  address: string
  amount?: string
  chain?: string
  kind: 'txLog'
  message?: string
  status: string
  txHash: string
  type: 'transfer' | 'stake' | 'unstake'
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

if (env('prod')) {
  logger.add(
    new WinstonCloudWatch({
      name: 'dashboard-mainnet-backend',
      logGroupName: env('CLOUDWATCH_GROUP_NAME') as string,
      logStreamName: env('CLOUDWATCH_GROUP_NAME') as string,
      awsAccessKeyId: env('CLOUDWATCH_ACCESS_KEY') as string,
      awsSecretKey: env('CLOUDWATCH_SECRET_KEY') as string,
      awsRegion: env('CLOUDWATCH_REGION') as string,
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
