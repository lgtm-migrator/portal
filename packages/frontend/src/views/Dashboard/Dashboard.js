import React, { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useViewport } from 'use-viewport'
import 'styled-components/macro'
import { Spacer, useTheme, GU } from '@pokt-foundation/ui'
import NavigationBar from './NavigationBar'
import MenuPanel from '../../components/MenuPanel/MenuPanel'
import { AppsContextProvider, useUserApps } from '../../contexts/AppsContext'
import { UserContextProvider, useUser } from '../../contexts/UserContext'
import { trackUserProfile } from '../../lib/analytics'

function DashboardView({ children }) {
  const location = useLocation()
  const { appsLoading, userApps } = useUserApps()
  const { email, userLoading } = useUser()
  const theme = useTheme()
  const { below } = useViewport()

  const compactMode = below('medium')
  const [menuPanelOpen, setMenuPanelOpen] = useState(!compactMode)

  const toggleMenuPanel = useCallback(() => setMenuPanelOpen((v) => !v), [])
  const closeMenuPanel = useCallback(() => {
    setMenuPanelOpen(() => false)
  }, [])

  useEffect(() => {
    function addUserProfile() {
      if (appsLoading || userLoading) {
        return
      }

      const formattedApps = userApps.map(({ chain, id, isLb, name, apps }) => {
        const publicKeys = apps.map(({ publicKey }) => publicKey)

        return {
          chain,
          id,
          isLb,
          name,
          publicKeys,
        }
      })

      trackUserProfile({
        name: email,
        email,
        username: email,
        custom: {
          ...formattedApps,
        },
      })
    }

    addUserProfile()
  }, [appsLoading, email, userLoading, userApps])

  useEffect(() => {
    document.body.scrollTop = 0
  }, [location])

  return (
    <div
      css={`
        position: relative;
        width: 100%;
        min-height: 100vh;
        height: 100%;
        display: flex;
        flex-direction: row;
        background: linear-gradient(
          126.96deg,
          ${theme.backgroundGradient1} -5.41%,
          ${theme.backgroundGradient2} 101.86%
        );
        color: white;
        overflow-x: hidden;
      `}
    >
      <MenuPanel
        appsLoading={appsLoading}
        onMenuPanelClose={closeMenuPanel}
        opened={menuPanelOpen}
        userApps={userApps}
      />
      <main
        css={`
          height: auto;
          overflow-y: scroll;
          overflow-x: hidden;
          flex-grow: 1;
          max-width: 1152px;
          margin: 0 auto;
          ${!compactMode &&
          `
            padding-left: ${2 * GU}px;
            padding-right: ${2 * GU}px;
          `}
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        `}
      >
        <NavigationBar
          applications={userApps}
          toggleMenuPanel={toggleMenuPanel}
        />
        <Spacer size={5 * GU} />
        {compactMode ? (
          <div
            css={`
              padding-left: ${2 * GU}px;
              padding-right: ${2 * GU}px;
            `}
          >
            {children}
          </div>
        ) : (
          <>{children}</>
        )}
        <Spacer size={2 * GU} />
      </main>
    </div>
  )
}

export default function Dashboard({ children }) {
  return (
    <AppsContextProvider>
      <UserContextProvider>
        <DashboardView>{children}</DashboardView>
      </UserContextProvider>
    </AppsContextProvider>
  )
}
