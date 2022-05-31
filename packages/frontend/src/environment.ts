import pkg from '../package.json'

const ENV_VARS = {
  // String vars
  AUTH0_AUDIENCE() {
    return (import.meta.env.VITE_APP_AUTH0_AUDIENCE as string)?.trim() ?? ''
  },
  AUTH0_DOMAIN() {
    return (import.meta.env.VITE_APP_AUTH0_DOMAIN as string)?.trim() ?? ''
  },
  AUTH0_CLIENT_ID() {
    return (import.meta.env.VITE_APP_AUTH0_CLIENT_ID as string)?.trim() ?? ''
  },
  AUTH0_SCOPE() {
    return (import.meta.env.VITE_APP_AUTH0_SCOPE as string)?.trim() ?? ''
  },
  AUTH0_CACHE_LOCATION() {
    return (
      (import.meta.env.VITE_APP_AUTH0_CACHE_LOCATION as string)?.trim() ??
      'localstorage'
    )
  },
  AMPLITUDE_API_KEY() {
    return import.meta.env.VITE_APP_AMPLITUDE_API_KEY as string
  },
  BACKEND_URL() {
    return import.meta.env.VITE_APP_BACKEND_URL ?? ''
  },
  BUILD() {
    return pkg.gitHead ?? 'undefined'
  },
  SENTRY_DSN() {
    return import.meta.env.VITE_APP_SENTRY_DSN?.trim() ?? ''
  },

  // String array vars
  GODMODE_ACCOUNTS(): string[] {
    return import.meta.env.VITE_APP_GODMODE_ACCOUNTS?.trim().split(',') ?? []
  },

  // Boolean vars
  PROD() {
    return import.meta.env.MODE === 'production'
  },
}

type IStringVars =
  | 'AUTH0_AUDIENCE'
  | 'AUTH0_CACHE_LOCATION'
  | 'AUTH0_CLIENT_ID'
  | 'AUTH0_SCOPE'
  | 'AUTH0_DOMAIN'
  | 'AMPLITUDE_API_KEY'
  | 'BACKEND_URL'
  | 'BUILD'
  | 'SENTRY_DSN'
type IStringArrayVars = 'GODMODE_ACCOUNTS'
type IBooleanVars = 'PROD'

type IEnvVars = IStringVars | IStringArrayVars | IBooleanVars

export default function env<B extends IEnvVars>(
  name: B
): B extends IStringVars
  ? string
  : B extends IStringArrayVars
  ? string[]
  : boolean {
  return ENV_VARS[name]() as B extends IStringVars
    ? string
    : B extends IStringArrayVars
    ? string[]
    : boolean
}
