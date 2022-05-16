import jwt from 'express-jwt'
import jwks from 'jwks-rsa'
import env from '../environment'

export const checkJWT = jwt({
  secret: jwks.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: env('AUTH0_JWKS_URI'),
  }),
  audience: env('AUTH0_AUDIENCE'),
  issuer: env('AUTH0_ISSUER'),
  algorithms: ['RS256'],
})
