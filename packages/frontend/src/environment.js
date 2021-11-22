import pkg from '../package.json'

const ENV_VARS = {
  BACKEND_URL() {
    return import.meta.env.VITE_APP_BACKEND_URL ?? ''
  },
  BUILD() {
    return pkg.gitHead ?? 'undefined'
  },
  GODMODE_ACCOUNTS() {
    return import.meta.env.VITE_APP_GODMODE_ACCOUNTS?.trim().split(',') ?? []
  },
  HASURA_SECRET() {
    return import.meta.env.VITE_APP_HASURA_ADMIN_SECRET?.trim() ?? ''
  },
  HASURA_URL() {
    return import.meta.env.VITE_APP_HASURA_URL ?? ''
  },
  PROD() {
    return import.meta.env.MODE === 'production'
  },
  USE_TEST_APP() {
    return import.meta.env.VITE_APP_USE_TEST_APP === 'true' ?? false
  },
  TEST_APP_PUB_KEY() {
    return import.meta.env.VITE_APP_TEST_APP_PUB_KEY?.trim() ?? ''
  },
  SENTRY_DSN() {
    return import.meta.env.VITE_APP_SENTRY_DSN?.trim() ?? ''
  },
}

export default function env(name) {
  return ENV_VARS[name]()
}
