import React, { useCallback, useRef, useState, useContext } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { useMutation } from 'react-query'
import axios from 'axios'
import { useViewport } from 'use-viewport'
import 'styled-components/macro'
import { useAuth0 } from '@auth0/auth0-react'
import { UserLB } from '@pokt-foundation/portal-types'
import * as Sentry from '@sentry/react'
import {
  Button,
  ButtonBase,
  DiscButton,
  IconCog,
  IconPerson,
  Link,
  Popover,
  Spacer,
  textStyle,
  useTheme,
  GU,
  RADIUS,
} from '@pokt-foundation/ui'
import IconMenu from '../../components/MenuPanel/IconMenu'
import env from '../../environment'
import { shorten } from '../../lib/utils'
import { sentryEnabled } from '../../sentry'
import { FlagContext } from '../../contexts/flagsContext'

const DEFAULT_TITLE = 'Pocket Portal'
const MAX_CHARACTERS = 25

function useRouteTitle(applications: UserLB[] = []) {
  const { pathname } = useLocation()

  if (pathname.includes('notifications')) {
    return 'Notifications'
  }

  if (pathname.includes('success-details')) {
    return 'Request Details'
  }

  if (pathname.includes('security')) {
    return 'App Security'
  }

  if (pathname.includes('app')) {
    const title = applications.reduce(
      (title, { id, name }) => (pathname.includes(id) ? name : title),
      DEFAULT_TITLE
    )

    return shorten(title, MAX_CHARACTERS)
  }

  if (pathname.includes('home')) {
    return 'Network Overview'
  }

  if (pathname.includes('create')) {
    return 'Application Setup'
  }

  return DEFAULT_TITLE
}

interface NavigationBarProps {
  applications: UserLB[]
  toggleMenuPanel: () => void
}

export default function NavigationBar({
  applications = [],
  toggleMenuPanel,
}: NavigationBarProps) {
  const history = useHistory()
  const title = useRouteTitle(applications)
  const theme = useTheme()
  const { logout } = useAuth0()
  const { flags } = useContext(FlagContext)

  const path = `${env('BACKEND_URL')}/api/users/logout`

  const { mutate: onLogout } = useMutation(async function () {
    try {
      if (flags.useAuth0) {
        logout()
        history.push('/')
      } else {
        await axios.post(
          path,
          {},
          {
            withCredentials: true,
          }
        )
        history.push('/login')
      }
    } catch (err) {
      if (sentryEnabled) {
        Sentry.captureException(err)
      }
      throw err
    }
  })
  const { below } = useViewport()
  const compact = below('medium')

  return compact ? (
    <>
      <div
        css={`
          display: flex;
          flex-direction: row;
          background: linear-gradient(
            180deg,
            ${theme.surfaceGradient1} 0%,
            ${theme.surfaceGradient2} 100%
          );
          width: 100%;
          height: ${7.5 * GU}px;
          justify-content: space-between;
          align-items: center;
          padding-left: ${3 * GU}px;
          padding-right: ${3 * GU}px;
        `}
      >
        <MenuPanelButton onClick={toggleMenuPanel} />
        <SettingsButton onLogout={onLogout} />
      </div>
      <Spacer size={1 * GU} />
      <h1
        css={`
          display: inline-block;
          flex-grow: 1;
          ${textStyle('title2')}
          padding-left: ${3 * GU}px;
        `}
      >
        <span>{title}</span>
      </h1>
    </>
  ) : (
    <nav
      css={`
        display: flex;
        flex-direction: row;
        margin-top: ${3 * GU}px;
        align-items: center;
      `}
    >
      <h1
        css={`
          display: inline-block;
          flex-grow: 1;
          ${textStyle('title3')}
        `}
      >
        <span>{title}</span>
      </h1>
      <ul
        css={`
          list-style: none;
          display: flex;
          justify-content: center;
          align-items: center;
          li {
            display: inline-block;
          }
          li:not(:last-child) {
            margin-right: ${7 * GU}px;
          }
        `}
      >
        <li>
          <Link
            href="https://discord.com/invite/uYs6Esum3r"
            css={`
              && {
                color: ${theme.content};
                text-decoration: none;
                &:hover {
                  color: ${theme.accent};
                }
              }
            `}
          >
            Community
          </Link>
        </li>
        <li>
          <SettingsButton onLogout={onLogout} />
        </li>
      </ul>
    </nav>
  )
}

interface MenuPanelButtonProps {
  onClick: () => void
}

function MenuPanelButton({ onClick }: MenuPanelButtonProps) {
  return (
    <Button icon={IconMenu} display="all" mode="primary" onClick={onClick}>
      <IconMenu />
    </Button>
  )
}

interface SettingsButtonProps {
  onLogout: () => void
}

function SettingsButton({ onLogout }: SettingsButtonProps) {
  const theme = useTheme()
  const [opened, setOpened] = useState(false)
  const containerRef = useRef()
  const { below } = useViewport()
  const compact = below('medium')

  const handleToggle = useCallback(() => setOpened((opened) => !opened), [])
  const handleClose = useCallback(() => setOpened(false), [])

  return (
    <React.Fragment>
      <div ref={containerRef}>
        <DiscButton
          element="div"
          description="Preferences"
          label="Preferences"
          onClick={handleToggle}
          css={`
            && {
              width: ${4.25 * GU}px;
              height: ${4.25 * GU}px;
              padding: ${0.5 * GU}px;
              background: transparent;
              height: 100%;
              border: none;
              box-shadow: none;
            }
          `}
        >
          <IconPerson
            css={`
              color: ${theme.content};
              width: ${3.25 * GU}px;
              height: ${3.25 * GU}px;
            `}
          />
        </DiscButton>
      </div>
      <Popover
        closeOnOpenerFocus
        placement="bottom-end"
        onClose={handleClose}
        visible={opened}
        opener={containerRef.current}
      >
        <ul
          css={`
            /* Use 20px as the padding setting for popper is 10px */
            width: ${below('medium') ? `calc(100vw - 20px)` : `${30 * GU}px`};
            padding: 0;
            margin: 0;
            list-style: none;
            background: ${theme.surface};
            color: ${theme.content};
            border-radius: ${RADIUS}px;
          `}
        >
          <li
            css={`
              display: flex;
              align-items: center;
              height: ${4 * GU}px;
              padding-left: ${2 * GU}px;
              border-bottom: 1px solid ${theme.border};
              ${textStyle('label2')}
              color: ${theme.surfaceContentSecondary};
            `}
          >
            Preferences
          </li>
          {compact && (
            <Item
              href="https://discord.com/invite/uYs6Esum3r"
              icon={IconCog}
              label="Community"
            />
          )}
          <Item onClick={() => onLogout()} icon={IconCog} label="Logout" />
        </ul>
      </Popover>
    </React.Fragment>
  )
}

interface ItemProps {
  href?: string
  icon: string
  label: string
  onClick?: () => void
}

function Item({ href = '', icon, label, onClick }: ItemProps) {
  const theme = useTheme()

  return (
    <li
      css={`
        & + & {
          border-top: 1px solid ${theme.border};
        }
      `}
    >
      <ButtonBase
        onClick={onClick}
        href={href}
        label={label}
        css={`
          width: 100%;
          height: ${7 * GU}px;
          border-radius: 0;
        `}
      >
        <div
          css={`
            display: flex;
            width: 100%;
            height: 100%;
            padding: ${2 * GU}px;
            justify-content: left;
            align-items: center;

            &:active,
            &:focus {
              background: ${theme.surfacePressed};
            }
          `}
        >
          {icon && <img src={icon} alt="" />}
          <div
            css={`
              flex-grow: 1;
              display: flex;
              align-items: center;
              margin-left: ${icon ? 1 * GU : 0}px;
            `}
          >
            {label}
          </div>
        </div>
      </ButtonBase>
    </li>
  )
}
