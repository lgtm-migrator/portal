import mongoose from 'mongoose'
import env from './environment'

const DEV_DB_URL =
  'mongodb://mongo-client:mongo-password@localhost:27017/gateway-testnet?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&directConnection=true&ssl=false'

function composeMongoUrl(production = false) {
  return production ? `${env('DATABASE_URL')}` : `${DEV_DB_URL}`
}

export const connect = (
  url = composeMongoUrl(env('PROD') as boolean),
  opts = {}
): Promise<typeof mongoose> => {
  const userSettings = env('PROD')
    ? {
        user: env('DATABASE_USER') as string,
        pass: env('DATABASE_PASSWORD') as string,
      }
    : {}

  return mongoose.connect(`${url}`, {
    ...opts,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ...userSettings,
  })
}

export const disconnect = async () => {
  await mongoose.disconnect()
}
