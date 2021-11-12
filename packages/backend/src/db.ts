import mongoose from 'mongoose'
import env from './environment'

const DEV_DB_URL = 'mongodb://localhost:27017/gateway-testnet'

function composeMongoUrl(production = false) {
  return production
    ? `mongodb+srv://${env('DATABASE_USER')}:${env(
        'DATABASE_PASSWORD'
      )}@gateway.kxobp.mongodb.net/${env(
        'DATABASE_NAME'
      )}?retryWrites=true&w=majority`
    : `${DEV_DB_URL}`
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
