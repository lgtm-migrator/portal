import pkg from '../package.json'

type EnvVarKey =
  | 'AUTH0_AUDIENCE'
  | 'AUTH0_CACHE_LOCATION'
  | 'AUTH0_CLIENT_ID'
  | 'AUTH0_SCOPE'
  | 'AUTH0_DOMAIN'
  | 'AMPLITUDE_API_KEY'
  | 'BACKEND_URL'
  | 'BUILD'
  | 'GODMODE_ACCOUNTS'
  | 'PROD'
  | 'SENTRY_DSN'

const ENV_VARS = {
  AUTH0_AUDIENCE(): string {
    return (import.meta.env.VITE_APP_AUTH0_AUDIENCE as string)?.trim() ?? ''
  },
  AUTH0_DOMAIN(): string {
    return (import.meta.env.VITE_APP_AUTH0_DOMAIN as string)?.trim() ?? ''
  },
  AUTH0_CLIENT_ID(): string {
    return (import.meta.env.VITE_APP_AUTH0_CLIENT_ID as string)?.trim() ?? ''
  },
  AUTH0_SCOPE(): string {
    return (import.meta.env.VITE_APP_AUTH0_SCOPE as string)?.trim() ?? ''
  },
  AUTH0_CACHE_LOCATION(): string {
    return (import.meta.env.VITE_APP_CACHE_LOCATION as string)?.trim() ?? ''
  },
  AMPLITUDE_API_KEY(): string {
    return import.meta.env.VITE_APP_AMPLITUDE_API_KEY as string
  },
  BACKEND_URL(): string {
    return import.meta.env.VITE_APP_BACKEND_URL ?? ''
  },
  BUILD(): string {
    return pkg.gitHead ?? 'undefined'
  },
  GODMODE_ACCOUNTS(): string[] {
    return import.meta.env.VITE_APP_GODMODE_ACCOUNTS?.trim().split(',') ?? []
  },
  PROD(): boolean {
    return import.meta.env.MODE === 'production'
  },
  SENTRY_DSN(): string {
    return import.meta.env.VITE_APP_SENTRY_DSN?.trim() ?? ''
  },
}

export default function env(name: EnvVarKey): unknown {
  const envGetter = ENV_VARS[name]

  return envGetter() as ReturnType<typeof envGetter>
}
