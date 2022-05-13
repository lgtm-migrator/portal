const flagsData = () => {
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
