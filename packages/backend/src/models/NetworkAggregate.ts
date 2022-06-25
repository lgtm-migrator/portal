import { Schema, model, Model, Document } from 'mongoose'

export interface INetworkAggregator extends Document {
  total: number
  success: number
  error: number
  date: string
  createdAt: Date
  updatedAt: Date
}

const networkAggregatorSchema = new Schema(
  {
    total: Number,
    success: Number,
    error: Number,
    date: String,
    createdAt: Date,
    updatedAt: Date,
  },
  { collection: 'NetworkAggregator' }
)

const NetworkAggregatorModel: Model<INetworkAggregator> = model(
  'NetworkAggregator',
  networkAggregatorSchema
)

export default NetworkAggregatorModel
