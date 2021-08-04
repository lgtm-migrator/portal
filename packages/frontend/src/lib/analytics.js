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
