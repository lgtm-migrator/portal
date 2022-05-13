import jwt from 'express-jwt'
import jwks from 'jwks-rsa'
import env from '../environment'

export const checkJWT = jwt({
  secret: jwks.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: env('AUTH0_JWKS_URI') as string,
  }),
  audience: env('AUTH0_AUDIENCE') as string,
  issuer: env('AUTH0_ISSUER') as string,
  algorithms: ['RS256'],
})
