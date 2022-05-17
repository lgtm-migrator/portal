export interface FlagsData {
  authHeaders: {
    headers?: { Authorization: string }
    withCredentials?: boolean
  }
  useAuth0: boolean
}

const flagsData = (): FlagsData => {
  return {
    authHeaders:
      sessionStorage.getItem('useAuth0') === 'true'
        ? {
            headers: {
              Authorization: 'Bearer test',
            },
          }
        : { withCredentials: true },
    useAuth0: sessionStorage.getItem('useAuth0') === 'true',
  }
}

export default flagsData
