import { InfluxDB } from '@influxdata/influxdb-client'
import env from '../environment'

type QueryParams = {
  start: string
  stop: string
}

type AppQueryParams = QueryParams & {
  publicKeys: string[]
}

type FilteredAppQueryParams = AppQueryParams & {
  result?: string
}

export const influx = new InfluxDB({
  url: env('INFLUX_ENDPOINT') as string,
  token: env('INFLUX_TOKEN') as string,
  timeout: 60000,
}).getQueryApi(env('INFLUX_ORG') as string)

export const NETWORK_AGGREGATES_QUERY = `
success = from(bucket: "mainnetRelay1d")
|> range(start: -168h, stop: -0h)
|> filter(fn: (r) =>
  r._measurement == "relay" and
  r._field == "count" and
  (r.method != "synccheck" and r.method != "chaincheck" and r.method != "checks") and
  r.result == "200"
)
|> group(columns: ["host", "nodePublicKey", "region", "result", "method"])
|> keep(columns: ["_value"])
|> sum()
|> map(fn: (r) => ({r with sync: "1", _field: "success"}))

total = from(bucket: "mainnetRelay1d")
|> range(start: -168h, stop: -0h)
|> filter(fn: (r) =>
  r._measurement == "relay" and
  r._field == "count" and
  (r.method != "synccheck" and r.method != "chaincheck") and
  r.nodePublicKey !~ /^fallback/
)
|> group(columns: ["host", "nodePublicKey", "region", "result", "method"])
|> keep(columns: ["_value"])
|> sum()
|> map(fn: (r) => ({r with sync: "1", _field: "total"}))

union(
  tables: [success, total]
)
|> pivot(
    rowKey: ["sync"],
    columnKey: ["_field"],
    valueColumn: "_value"
)

|> map(fn: (r) => ({
        r with
        total:
            if r.success > r.total then r.success
            else r.total
        })
      )
`

export const DAILY_NETWORK_RELAYS_QUERY = `
from(bucket: "mainnetRelay60m")
  |> range(start: -7d, stop: -0d)
  |> filter(fn: (r) =>
    r._measurement == "relay" and
    r._field == "count" and
    (r.method != "synccheck" and r.method != "chaincheck") and
    contains(value: r["blockchain"], set: ["0001","0002","0003","0004","0005","0006","0007","0009","0010","0021","0022","0023","0024","0025","0026","0027","0028"]) and
    r.result == "200"
  )
  |> group(columns: ["host", "nodePublicKey", "region", "result", "method"])
  |> keep(columns: ["_time", "_value"])
  |> aggregateWindow(every: 1d, fn: sum)
`

export function buildSuccessfulNetworkRelaysQuery({
  start,
  stop,
}: QueryParams): string {
  return `
from(bucket: "mainnetRelay1d")
  |> range(start: ${start}, stop: ${stop})
  |> filter(fn: (r) =>
    r._measurement == "relay" and
    r._field == "count" and
    (r.method != "synccheck" and r.method != "chaincheck") and
    contains(value: r["blockchain"], set: ["0001","0002","0003","0004","0005","0006","0007","0009","0010","0021","0022","0023","0024","0025","0026","0027","0028"]) and
    r.result == "200"
  )
  |> group(columns: ["host", "nodePublicKey", "region", "result", "method"])
  |> keep(columns: ["_time", "_value"])
  |> aggregateWindow(every: 1d, fn: sum)
`
}

export function buildSuccessfulAppRelaysQuery({
  publicKeys,
  start,
  stop,
}: AppQueryParams): string {
  return `
successful_relays = from(bucket: "mainnetRelay60m")
  |> range(start: ${start}, stop: ${stop})
  |> filter(fn: (r) =>
    r._measurement == "relay" and
    r._field == "count" and
    (r.method != "synccheck" and r.method != "chaincheck" and r.method != "checks") and
    contains(value: r["applicationPublicKey"], set: ${JSON.stringify(
      publicKeys
    )}) and
    r.result == "200"
  )
  |> group(columns: ["host", "nodePublicKey", "region", "result", "method"])
  |> keep(columns: ["_value"])
  |> sum()
  |> map(fn: (r) => ({r with sync: "1", _field: "success"}))
  |> yield()
`
}

export function buildTotalAppRelaysQuery({
  publicKeys,
  start,
  stop,
}: AppQueryParams): string {
  return `
total_relays = from(bucket: "mainnetRelay60m")
  |> range(start: ${start}, stop: ${stop})
  |> filter(fn: (r) =>
    r._measurement == "relay" and
    r._field == "count" and
    (r.method != "synccheck" and r.method != "chaincheck" and r.method != "checks") and
    contains(value: r["applicationPublicKey"], set: ${JSON.stringify(
      publicKeys
    )}) and
    r.nodePublicKey !~ /^fallback/
  )
  |> group(columns: ["host", "nodePublicKey", "region", "result", "method"])
  |> keep(columns: ["_value"])
  |> sum()
  |> map(fn: (r) => ({r with sync: "1", _field: "total"}))
  |> yield()
`
}

export function buildSessionRelaysQuery({
  publicKeys,
  start,
  stop,
}: AppQueryParams): string {
  return `
from(bucket: "mainnetRelay10m")
  |> range(start: ${start}, stop: ${stop})
  |> filter(fn: (r) =>
    r._measurement == "relay" and
    r._field == "count" and
    (r.method != "synccheck" and r.method != "chaincheck") and
    contains(value: r["applicationPublicKey"], set: ${JSON.stringify(
      publicKeys
    )}) and
    r.result == "200"
  )
  |> group(columns: ["host", "nodePublicKey", "region", "result", "method"])
  |> keep(columns: ["_time", "_value"])
  |> sum(column: "_value")
  |> yield()
`
}

export function buildDailyAppRelaysQuery({
  publicKeys,
  start,
  stop,
}: AppQueryParams): string {
  return `
from(bucket: "mainnetRelay1d")
|> range(start: ${start}, stop: ${stop})
|> filter(fn: (r) =>
  r._measurement == "relay" and
  r._field == "count" and
  (r.method != "synccheck" and r.method != "chaincheck") and
  contains(value: r["applicationPublicKey"], set: ${JSON.stringify(
    publicKeys
  )}) and
  r.result == "200"
)
|> group(columns: ["host", "nodePublicKey", "region", "result", "method"])
|> keep(columns: ["_time", "_value"])
|> aggregateWindow(every: 1d, fn: sum)
  `
}

export function buildHourlyLatencyQuery({
  publicKeys,
  start,
  stop,
}: AppQueryParams): string {
  return `
from(bucket: "mainnetRelay60m")
  |> range(start: ${start}, stop: ${stop})
|> filter(fn: (r) =>
  r._measurement == "relay" and
  r._field == "elapsedTime" and
  (r.method != "synccheck" and r.method != "chaincheck") and
  contains(value: r["applicationPublicKey"], set: ${JSON.stringify(
    publicKeys
  )}) and
  r.result == "200"
)
|> group(columns: ["host", "nodePublicKey", "region", "result", "method"])
|> keep(columns: ["_time", "_value"])
|> aggregateWindow(every: 1h, fn: mean)

  `
}

export function buildLatestFilteredQueries({
  publicKeys,
  start,
  stop,
  result,
}: FilteredAppQueryParams): string {
  return `
bytes = from(bucket: "mainnetRelay")
|> range(start: ${start}, stop: ${stop})
|> filter(fn: (r) =>
  r._measurement == "relay" and
  r._field == "bytes" and
  (r.method != "synccheck" and r.method != "chaincheck") and
  contains(value: r["applicationPublicKey"], set: ${JSON.stringify(publicKeys)})
  ${result ? `and r.result == "${result}"` : ''}
)

elapsedTime = from(bucket: "mainnetRelay")
|> range(start: ${start}, stop: ${stop})
|> filter(fn: (r) =>
  r._measurement == "relay" and
  r._field == "elapsedTime" and
  (r.method != "synccheck" and r.method != "chaincheck") and
  contains(value: r["applicationPublicKey"], set: ${JSON.stringify(publicKeys)})
  ${result ? `and r.result == "${result}"` : ''}
)

union(tables: [elapsedTime, bytes])

|> group(columns: ["applicationPublicKey"])
|> pivot(columnKey: ["_field", "result"], rowKey: ["_time", "method", "nodePublicKey"], valueColumn: "_value")
|> sort(desc: true, columns: ["_time"])
|> limit(n: 5)
  `
}
