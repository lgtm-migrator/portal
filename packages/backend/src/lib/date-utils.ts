import dayjs from 'dayjs'
import dayJsutcPlugin from 'dayjs/plugin/utc'

dayjs.extend(dayJsutcPlugin)

export function getUTCTimestamp(): string {
  const timestamp = new Date()

  return timestamp.toISOString()
}

export function composeDaysFromNowUtcDate(daysAgo: number): string {
  const dateDaysAgo = dayjs.utc().subtract(daysAgo, 'day')

  return dateDaysAgo.format('YYYY-MM-DDTHH:mm:ss[.000Z]')
}

export function composeHoursFromNowUtcDate(hoursAgo: number): string {
  const hourAgo = dayjs.utc().subtract(hoursAgo, 'hour')

  return hourAgo.format('YYYY-MM-DDTHH:mm:ss[.000Z]')
}

export function composeTodayUtcDate(): string {
  const today = dayjs.utc()

  const monthDate =
    today.month() + 1 < 10 ? `0${today.month() + 1}` : today.month() + 1
  const todayDate = today.date() < 10 ? `0${today.date()}` : today.date()

  const todayBucket = `${today.year()}-${monthDate}-${todayDate}T00:00:00.000Z`

  return todayBucket
}

export function getSecondsUntilTomorrowUtc(): number {
  const now = dayjs.utc()
  const tomorrow = dayjs.utc().startOf('d').add(1, 'day')

  return tomorrow.diff(now, 's')
}

export { dayjs }
