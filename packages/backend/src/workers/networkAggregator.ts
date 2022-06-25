import { dayjs } from '../lib/date-utils'
import { influx, NETWORK_AGGREGATES_DAY_QUERY } from '../lib/influx'
import NetworkAggregatorModel, {
  INetworkAggregator,
} from '../models/NetworkAggregate'

export async function registerNetworkAggregator(
  ctx
): Promise<{ success: boolean }> {
  const start = dayjs.utc().startOf('day').toISOString()
  const stop = dayjs.utc().toISOString()
  const response = await influx
    .collectRows(NETWORK_AGGREGATES_DAY_QUERY({ start, stop }))
    .catch((e) => {
      console.log(e)
    })

  if (!response) {
    return { success: false }
  }

  const [{ total, success, error }] = response as [
    { total: number; success: number; error: number }
  ]

  const networkAggregator: INetworkAggregator = new NetworkAggregatorModel({
    total: total,
    success: success,
    error: error,
    date: start,
    updatedAt: new Date(Date.now()),
    createdAt: new Date(Date.now()),
  })

  var upsertData = networkAggregator.toObject()
  delete upsertData._id

  await NetworkAggregatorModel.updateOne(
    { date: start },
    upsertData,
    { upsert: true },
    function (err: any) {
      if (err) {
        return { success: false }
      }
    }
  )

  return { success: true }
}
