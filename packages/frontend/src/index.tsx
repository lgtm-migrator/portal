import ReactDOM from 'react-dom'
import '@fontsource/manrope'
import App from './App'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as _ from 'styled-components/cssprop'
import initializeSentry from './sentry'

initializeSentry()

ReactDOM.render(<App />, document.getElementById('root'))
