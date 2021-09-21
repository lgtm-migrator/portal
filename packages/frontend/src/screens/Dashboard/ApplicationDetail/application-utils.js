import * as dayjs from 'dayjs'
import * as dayJsutcPlugin from 'dayjs/plugin/utc'
import { useTheme } from '@pokt-foundation/ui'
import { norm } from '../../../lib/math-utils'
import { formatNumberToSICompact } from '../../../lib/formatting-utils'

const ONE_MILLION = 1000000
const ONE_SECOND = 1 // Data for graphs come in second

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const DEFAULT_EMPTY_RELAYS = [
  {
    dailyRelays: 0,
  },
  {
    dailyRelays: 0,
  },
]

const DEFAULT_LATENCY_LABELS = Array(24)
  .fill('')
  .map((_) => '00')

const DEFAULT_LATENCY_SCALE = [
  { label: '0ms' },
  { label: '250ms' },
  { label: '500ms' },
  { label: '750ms' },
  { label: '1000ms', highlightColor: '#AE1515' },
  { label: '' },
]

const DEFAULT_LATENCY_VALUES = [
  {
    id: 1,
    values: Array(24).fill(0),
  },
]

export function useUsageColor(usage) {
  const theme = useTheme()

  if (usage <= 0.25) {
    return theme.positive
  }

  if (usage <= 0.5) {
    return theme.yellow
  }

  if (usage <= 0.75) {
    return theme.warning
  }

  return theme.negative
}

export function useSuccessRateColor(successRate) {
  if (successRate >= 0.8) {
    return ['#034200', '#55b02b']
  } else {
    return ['#881d26', '#ff0003']
  }
}

export function formatDailyRelaysForGraphing(
  dailyRelays = [],
  upperBound = ONE_MILLION
) {
  const labels = dailyRelays
    .map(({ bucket }) => bucket.split('T')[0])
    .map((bucket) => DAYS[new Date(bucket).getUTCDay()])

  const processedDailyRelays =
    dailyRelays.length === 1
      ? [...dailyRelays, { dailyRelays: 0 }]
      : dailyRelays.length === 0
      ? DEFAULT_EMPTY_RELAYS
      : dailyRelays

  const lines = [
    {
      id: 1,
      values: processedDailyRelays.map(({ dailyRelays }) =>
        norm(dailyRelays, 0, upperBound)
      ),
    },
  ]

  const scales = [
    { label: '0' },
    { label: formatNumberToSICompact(upperBound * 0.25) },
    { label: formatNumberToSICompact(upperBound * 0.5) },
    { label: formatNumberToSICompact(upperBound * 0.75) },
    {
      label: formatNumberToSICompact(upperBound),
      highlightColor: '#AE1515',
    },
    { label: '' },
  ]

  return {
    labels,
    lines,
    scales,
  }
}

export function formatLatencyValuesForGraphing(
  hourlyLatency = [],
  upperBound = ONE_SECOND
) {
  if (!hourlyLatency.length) {
    return {
      barValues: DEFAULT_LATENCY_VALUES,
      labels: DEFAULT_LATENCY_LABELS,
      scales: DEFAULT_LATENCY_SCALE,
    }
  }

  dayjs.extend(dayJsutcPlugin)

  const labels =
    hourlyLatency.length > 0
      ? hourlyLatency
          .map(({ bucket }) => {
            return bucket.split('T')[1]
          })
          .map((bucket) => bucket.substring(0, 2))
      : Array(24)
          .fill('')
          .map(() => '00')

  while (labels.length < 24) {
    labels.push('--')
  }

  const boundedLatencyValues = hourlyLatency.map(({ latency }) =>
    norm(latency, 0, upperBound)
  )

  while (boundedLatencyValues.length < 24) {
    boundedLatencyValues.push(0)
  }

  const barValues = [
    {
      id: 1,
      values: boundedLatencyValues,
    },
  ]

  const scales = DEFAULT_LATENCY_SCALE

  return {
    barValues,
    labels,
    scales,
  }
}
