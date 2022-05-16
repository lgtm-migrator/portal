import mongoose from 'mongoose'
import env from './environment'

const DEV_DB_URL =
  'mongodb://mongo-client:mongo-password@localhost:27017/gateway-testnet?authSource=admin'

function composeMongoUrl(production = false) {
  return production ? env('DATABASE_URL') : DEV_DB_URL
}

export const connect = (
  url = composeMongoUrl(env('PROD')),
  opts = {}
): Promise<typeof mongoose> => {
  console.debug('URL HERE!!', { url })

  const userSettings = env('PROD')
    ? {
        user: env('DATABASE_USER'),
        pass: env('DATABASE_PASSWORD'),
      }
    : {}

  return mongoose.connect(url, {
    ...opts,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ...userSettings,
  })
}

export const disconnect = async () => {
  await mongoose.disconnect()
}
