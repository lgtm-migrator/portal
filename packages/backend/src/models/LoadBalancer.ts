import { Schema, model, Model, Document, Types } from 'mongoose'

interface INotificationSettings {
  signedUp: boolean
  quarter: boolean
  quarterLastSent?: Date | number
  half: boolean
  halfLastSent?: Date | number
  threeQuarters: boolean
  threeQuartersLastSent?: Date | number
  full: boolean
  fullLastSent?: Date | number
  createdAt?: Date | number
}

export interface ILoadBalancer extends Document {
  user: string
  name: string
  requestTimeOut: string
  applicationIDs: string[]
  notificationSettings: INotificationSettings
  createdAt: Date | number
  updatedAt?: Date | number
  chain: string
  gigastakeRedirect?: boolean
}

const LoadBalancerSchema = new Schema<ILoadBalancer>(
  {
    user: { type: String, ref: 'User' },
    name: String,
    requestTimeOut: String,
    applicationIDs: [],
    gigastakeRedirect: Boolean,
    createdAt: {
      type: Date,
      default: new Date(Date.now()),
    },
    updatedAt: {
      type: Date,
    },
  },
  { collection: 'LoadBalancers' }
)

const LoadBalancerModel: Model<ILoadBalancer> = model(
  'LoadBalancers',
  LoadBalancerSchema
)

export default LoadBalancerModel
