export {} // <- Just to make Typescript shut up when this is commented out.

/* ---- This script can be used to determine which users from 
the database were not correctly imported into Auth0.

userExport is a JSON file of all Auth0 users exported 
from the Auth0 console using the export extension. 

This must be done manually as Auth0 only allows fetching of
a maximum of 1000 users using their API endpoints. ---- */

// import userExport from './user-export.json'
// import * as fs from 'fs'

// import { connect, disconnect } from '../db'
// import User from '../models/User'

// interface ParsedUser {
//   user_id: string
//   email: string
//   password_hash: string
//   user_metadata: { legacy: boolean }
// }

// const fetchAndParseUsers = async (query = {}): Promise<ParsedUser[]> => {
//   const users = await User.find(query)
//   return users.map<ParsedUser>(({ id, email, password }) => ({
//     user_id: String(id),
//     email,
//     password_hash: password,
//     user_metadata: { legacy: true },
//   }))
// }

// ;(async () => {
//   await connect()

//   const parsedUsers = await fetchAndParseUsers()

//   console.log('Users in DB:', parsedUsers.length)
//   console.log('Users in Export Batch:', userExport.length)
//   console.log('Users not imported into Auth0:', parsedUsers.length - userExport.length)

//   const exportIds = userExport.map(({ user_id }) => user_id.replace(/auth0\|/g, ""))
//   const exportEmails = userExport.map(({ email }) => email)
//   const missingInExport = parsedUsers.filter(
//     ({ user_id, email }) =>
//       !exportIds.includes(user_id) && !exportEmails.includes(email)
//   )

//   console.log("Users missing in export (should match above): ", missingInExport.length)

//   fs.writeFileSync('./not-exported.json', JSON.stringify(missingInExport))

//   await disconnect()
// })()
