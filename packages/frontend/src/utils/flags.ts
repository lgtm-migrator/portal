const flagsData = {
  authHeaders:
    sessionStorage.getItem('useAuth0') === 'true'
      ? {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('AuthToken')}`,
          },
        }
      : { withCredentials: true },
  useAuth0: sessionStorage.getItem('useAuth0') === 'true',
  key: 'value',
}

export default flagsData
