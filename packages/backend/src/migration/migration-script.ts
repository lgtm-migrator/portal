import axios from 'axios'
import FormData from 'form-data'
import * as fs from 'fs'
import { config } from 'dotenv'

import { connect, disconnect } from 'mongoose'
import User from '../models/User'

config({ path: '../../.env' })

const FILENAME = './parsed-users-temp.json'
const { AUTH0_DOMAIN, TOKEN, CONNECTION_ID, MONGO_URI } = process.env

interface ParsedUser {
  user_id: string
  email: string
  password_hash: string
  email_verified: boolean
  user_metadata: { legacy: boolean }
}

function waitMins(minutes: number) {
  return new Promise((resolve) => setTimeout(resolve, minutes * 60 * 1000))
}

/** Gets all users from the MongoDB users collection, formats to the required JSON format
 * for Auth0 import and returns them in batches of 2000 users to get around Auth0 filesize limit
 */
const fetchAndFormatUsers = async (query = {}): Promise<ParsedUser[][]> => {
  const users = await User.find(query)
  console.log(`Fetched ${users.length} users from the database ...`)

  const parsedUsers = users.map<ParsedUser>(({ id, email, password }) => ({
    user_id: String(id),
    email: email
      .trim() // Fix obvious common email errors
      .toLowerCase()
      .replace(/ /g, '')
      .replace(',com', '.com')
      .replace('@@', '@')
      .replace('gmailcom', 'gmail.com'),
    password_hash: password,
    email_verified: true,
    user_metadata: { legacy: true },
  }))

  const userArrays: ParsedUser[][] = []
  while (parsedUsers.length) {
    userArrays.push(parsedUsers.splice(0, 2000))
  }

  console.log(
    `Returning ${userArrays.length} batches of 2000 users from the database ...`
  )

  return userArrays
}

/** Takes users from DB split into batches and imports into Auth0, one batch at a time. */
const importUsers = async (formattedUsersArray: ParsedUser[][]) => {
  formattedUsersArray.forEach((batch) => {
    const { length: batchSizeInBytes } = Buffer.from(JSON.stringify(batch))
    if (batchSizeInBytes > 512000) {
      throw new Error(`Batch is too large for import to Auth0.`)
    }
  })

  let index = 0
  while (index <= formattedUsersArray.length - 1) {
    try {
      fs.writeFileSync(FILENAME, JSON.stringify(formattedUsersArray[index]))

      const formData = new FormData()
      formData.append('connection_id', CONNECTION_ID)
      formData.append('users', fs.createReadStream(FILENAME))

      const res = await axios.post(
        `https://${AUTH0_DOMAIN}/api/v2/jobs/users-imports`,
        formData,
        {
          headers: Object.assign({}, formData.getHeaders(), {
            authorization: `Bearer ${TOKEN}`,
          }),
        }
      )

      await new Promise<void>((resolve, reject) =>
        fs.unlink(FILENAME, (err) => {
          if (err) reject(err)
          resolve()
        })
      )

      index++
      console.log(
        `Importing batch ${index} of ${formattedUsersArray.length} ...`
      )
      console.log(res.data)
    } catch (err) {
      /* Auth0 only allows 2 imports simultaneously and a batch of 2000 takes around 8-9 minutes
      so I'm waiting 10 mins to be safe. In total there are currently 9 batches so it takes about 50 mins
      to import them all. Hang tight... */
      if (err.response.data.message.includes('active import users jobs')) {
        console.log(`${err.response.data.message}. Waiting 10 minutes ...`)
        await waitMins(10)
      } else {
        console.error(err)
        throw new Error(err.response)
      }
    }
  }
}

/* ---- Script Execution ---- */
;(async () => {
  await connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })

  const formattedUserBatches = await fetchAndFormatUsers()
  await importUsers(formattedUserBatches)

  await disconnect()
})()
