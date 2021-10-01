import dayjs from 'dayjs'
import dayJsutcPlugin from 'dayjs/plugin/utc'

export function getUTCTimestamp(): string {
  const timestamp = new Date()

  return timestamp.toISOString()
}

export function composeDaysFromNowUtcDate(daysAgo: number): string {
  dayjs.extend(dayJsutcPlugin)

  const dateDaysAgo = dayjs.utc().subtract(daysAgo, 'day')

  return dateDaysAgo.format()
}

export function composeHoursFromNowUtcDate(hoursAgo: number): string {
  dayjs.extend(dayJsutcPlugin)

  const dayAgo = dayjs.utc().subtract(hoursAgo, 'hour')

  return dayAgo.format()
}

export function composeTodayUtcDate(): string {
  dayjs.extend(dayJsutcPlugin)

  const today = dayjs.utc()

  const todayBucket = `${today.year()}-0${today.month() + 1}-${
    today.date() < 10 ? `0${today.date()}` : today.date()
  }T00:00:00+00:00`

  return todayBucket
}
