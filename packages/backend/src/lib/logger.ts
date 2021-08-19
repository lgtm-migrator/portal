import winston from 'winston'
import WinstonCloudWatch from 'winston-cloudwatch'
import env from '../environment'

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
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
    })
  )
}
export { logger }
