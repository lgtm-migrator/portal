import { Response, Request, NextFunction } from 'express'

import HttpError, { IContent } from '../errors/http-error'
import env from '../environment'

export const errorHandler =
  () =>
  (err: Error | HttpError, _req: Request, res: Response, _next: NextFunction): void => {
    let code: number
    let body: IContent

    if (!env('PROD')) {
      console.error(err)
    }

    if (err instanceof HttpError) {
      code = Number(err.code)
      body = err.content
    }


    res.status(code || 500).send(
      body || {
        errors: [
          {
            id: 'REQUEST_ERR',
            message: 'There was an error with your request',
          },
        ],
      }
    )
  }
