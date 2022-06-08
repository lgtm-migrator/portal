export function splitAuth0ID(id: string): string {
  if (!id) {
    throw new Error('No ID passed in')
  }

  if (id.includes('usr_')) {
    return id.split('usr_')[1]
  } else if (id.includes('auth0|')) {
    return id.split('auth0|')[1]
  } else {
    return id
  }
}
