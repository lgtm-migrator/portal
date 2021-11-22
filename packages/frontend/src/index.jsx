import React from 'react'
import ReactDOM from 'react-dom'
import '@fontsource/manrope'
import App from './App'
import { initializeCountly } from './lib/analytics'
import initializeSentry from './sentry'

initializeCountly()
initializeSentry()

ReactDOM.render(<App />, document.getElementById('root'))
