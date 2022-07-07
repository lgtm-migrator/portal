import React, { useCallback, useEffect, useState } from 'react'
import { useLocation, Redirect } from 'react-router-dom'
import { useViewport } from 'use-viewport'
import 'styled-components/macro'
import { Spacer, GU, textStyle } from '@pokt-foundation/ui'
import NavigationBar from './NavigationBar'
import MenuPanel from '../../components/MenuPanel/MenuPanel'
import { AppsContextProvider, useUserApps } from '../../contexts/AppsContext'
import { UserContextProvider } from '../../contexts/UserContext'
import { useAuth0 } from '@auth0/auth0-react'
import AnimatedLogo from '../../components/AnimatedLogo/AnimatedLogo'

interface DashboardViewProps {
  children: React.ReactNode
}

function DashboardView({ children }: DashboardViewProps) {
  const location = useLocation()

  const { appsLoading, userApps } = useUserApps()
  const { below } = useViewport()

  const compactMode = below('medium')
  const [menuPanelOpen, setMenuPanelOpen] = useState(!compactMode)

  const toggleMenuPanel = useCallback(() => setMenuPanelOpen((v) => !v), [])
  const closeMenuPanel = useCallback(() => {
    setMenuPanelOpen(() => false)
  }, [])

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
        background: linear-gradient(106.7deg, #0e1318 16.95%, #111a1f 87.74%);
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

interface DashboardProps {
  children: React.ReactNode
}

export default function Dashboard({ children }: DashboardProps) {
  const location = useLocation()
  const { user, isAuthenticated, isLoading } = useAuth0()

  if (isLoading) {
    return (
      <div
        css={`
          position: relative;
          width: 100%;
          /* TODO: This is leaky. fix up with a permanent component */
          height: 70vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        `}
      >
        <AnimatedLogo />
        <Spacer size={2 * GU} />
        <p
          css={`
            ${textStyle('body2')}
          `}
        >
          Loading dashboard...
        </p>
      </div>
    )
  }

  if (isAuthenticated && user) {
    return (
      <UserContextProvider>
        <AppsContextProvider>
          <DashboardView>{children}</DashboardView>
        </AppsContextProvider>
      </UserContextProvider>
    )
  }

  return (
    <Redirect
      to={{
        pathname: '/login',
        state: { from: location },
      }}
    />
  )
}
