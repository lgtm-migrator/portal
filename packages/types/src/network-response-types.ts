import { IChain } from './types'

export type ChainsResponse = IChain[]

export type NetworkSummaryResponse = {
  appsStaked: number
  nodesStaked: number
  poktStaked: number
}

export type NetworkDailyRelayBucket = {
  total_relays: number
  bucket: string
}

export type NetworkDailyRelaysResponse = NetworkDailyRelayBucket[]

export type NetworkWeeklyAggregatedRelaysResponse = {
  successful_relays: number
  total_relays: number
}
