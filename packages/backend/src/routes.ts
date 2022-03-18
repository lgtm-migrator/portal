import { Application as ExpressApplication } from 'express'
import Index from './controllers/DefaultController'
import Network from './controllers/NetworkController'
import LoadBalancer from './controllers/LoadBalancerController'
import User from './controllers/UserController'

export function configureRoutes(expressApp: ExpressApplication): void {
  expressApp.use('/', Index)

  expressApp.use('/api/users', User)
  expressApp.use('/api/v2/users', User)

  expressApp.use('/api/lb', LoadBalancer)
  expressApp.use('/api/v2/lb', LoadBalancer)

  expressApp.use('/api/network', Network)
}
