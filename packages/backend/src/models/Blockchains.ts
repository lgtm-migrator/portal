import { Schema, Model, model, Document } from 'mongoose'

export interface IChain extends Document {
  _id: string
  appCount: number
  description: string
  hash: string
  name: string
  network?: string
  networkID: string
  nodeCount: number
  ticker: string
}

const chainSchema = new Schema(
  {
    _id: String,
    appCount: Number,
    description: String,
    hash: String,
    name: String,
    networkID: String,
    nodeCount: Number,
    ticker: String,
  },
  { collection: 'Blockchains' }
)

const ChainModel: Model<IChain> = model('Chain', chainSchema)

export default ChainModel
