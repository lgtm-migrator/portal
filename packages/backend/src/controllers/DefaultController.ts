import express, { Response, Request } from 'express'

const router = express.Router()

router.get('', (_: Request, res: Response) => {
  res
    .status(200)
    .send(
      "Please visit <a href='https://mainnet.portal.pokt.network/'>https://mainnet.portal.pokt.network</a>"
    )
})

export default router
