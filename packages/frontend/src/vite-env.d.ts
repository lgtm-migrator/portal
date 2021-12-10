/// <reference types="vite/client" />
//
interface ImportMetaEnv {
  VITE_APP_BACKEND_URL?: string
  VITE_APP_GODMODE_ACCOUNTS?: string
  VITE_APP_SENTRY_DSN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
