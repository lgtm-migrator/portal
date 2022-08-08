import mongoose from 'mongoose'
import env from './environment'

export const connect = async (): Promise<void> => {
  const url = env('PROD') ? env('DATABASE_URL') : env('DEV_DATABASE_URL')
  const userSettings: mongoose.ConnectOptions = env('PROD')
    ? { user: env('DATABASE_USER'), pass: env('DATABASE_PASSWORD') }
    : {}

  await mongoose.connect(url, {
    ...userSettings,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
}

export const disconnect = async () => {
  await mongoose.disconnect()
}
