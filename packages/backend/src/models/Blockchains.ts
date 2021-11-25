import { Schema, Model, model, Document } from 'mongoose'

export interface IChain extends Document {
  _id: string
  appCount: number
  description: string
  hash: string
  name: string
  network?: string
  networkID: string
  requestTimeOut?: number
  nodeCount: number
  ticker: string
}

const chainSchema = new Schema<IChain>(
  {
    _id: String,
    appCount: Number,
    description: String,
    hash: String,
    name: String,
    networkID: String,
    nodeCount: Number,
    requestTimeOut: Number,
    ticker: String,
  },
  { collection: 'Blockchains' }
)

const ChainModel: Model<IChain> = model('Chain', chainSchema)

export default ChainModel
