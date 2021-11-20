import env from '../environment'

export function initializeCountly() {
  if (env('PROD')) {
    const countlyScript = document.createElement('script')

    countlyScript.innerHTML = `
      //some default pre init
      var Countly = Countly || {}
      Countly.q = Countly.q || []

      //provide countly initialization parameters
      Countly.app_key = '84c93ef4b39edb8d4a9fca5a7d91685554e64218'
      Countly.url = 'https://poktnetwork.count.ly'

      Countly.q.push(['track_sessions'])
      Countly.q.push(['track_pageview'])
      Countly.q.push(['track_clicks'])
      Countly.q.push(['track_links'])
      Countly.q.push(['track_forms'])

      //load countly script asynchronously
      ;(function () {
        var cly = document.createElement('script')
        cly.type = 'text/javascript'
        cly.async = true
        //enter url of script here
        cly.src = 'https://poktnetwork.count.ly/sdk/web/countly.min.js'
        cly.onload = function () {
          Countly.init()
        }
        var s = document.getElementsByTagName('script')[0]
        s.parentNode.insertBefore(cly, s)
      })()
  `

    document.body.appendChild(countlyScript)

    console.log('ANALYTICS ENABLED')
  }
}

export function trackEvent(event, options) {
  const countly = window.Countly

  if (countly && countly.q) {
    // See https://support.count.ly/hc/en-us/articles/360037441932-Web-analytics-JavaScript-#custom-events
    countly.q.push([
      'add_event',
      {
        key: event,
        count: 1,
        ...options,
      },
    ])
  }
}

export function trackUserProfile(user) {
  const countly = window.Countly

  if (countly && countly.q) {
    countly.q.push(['user_details', user])
  }
}
