import mongoose from 'mongoose'
import env from './environment'

const DEV_DB_URL =
  'mongodb+srv://portal-api:wNEepz5xcfmRclvQ@portal-api.kxobp.mongodb.net/gateway?authSource=admin&replicaSet=atlas-g67z6n-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true'

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
