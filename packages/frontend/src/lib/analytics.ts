import amplitude from 'amplitude-js'
import env from '../environment'

export const AmplitudeEvents = {
  SignupComplete: 'SIGNUP_COMPLETE',
  LoginComplete: 'LOGIN_COMPLETE',
  RelayMetricUpdate: 'RELAY_METRIC_UPDATE',
  EndpointCreation: 'ENDPOINT_CREATION',
  EndpointRemoval: 'ENDPOINT_REMOVAL',
  RequestDetailsView: 'REQUEST_DETAILS_VIEW',
  NotificationSettingsChange: 'NOTIFICATION_SETTINGS_CHANGE',
  SecuritySettingsUpdate: 'SECURITY_SETTINGS_UPDATE',
}

amplitude
  .getInstance()
  .init(
    env('AMPLITUDE_API_KEY'),
    undefined,
    { includeReferrer: true, includeUtm: true },
    function () {
      console.log('Amplitude initialized')
    }
  )
