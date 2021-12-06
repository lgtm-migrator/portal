import React from 'react'
import ReactDOM from 'react-dom'
import '@fontsource/manrope'
import App from './App'
import initializeSentry from './sentry'

initializeSentry()

ReactDOM.render(<App />, document.getElementById('root'))
