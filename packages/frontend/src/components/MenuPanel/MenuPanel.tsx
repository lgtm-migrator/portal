import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { animated, useSpring } from 'react-spring'
import { useViewport } from 'use-viewport'
import 'styled-components/macro'
import {
  ButtonBase,
  Spacer,
  useTheme,
  springs,
  GU,
  RADIUS,
} from '@pokt-foundation/ui'
import IconApp from './IconApp'
import IconNetwork from './IconNetwork'
import PortalLogo from '../../assets/portal_logo.svg'
import { lerp } from '../../lib/math-utils'
import { shorten } from '../../lib/utils'
import { ILBInfo } from '../../hooks/application-hooks'

type MenuRoute = {
  icon?: React.ReactNode
  id: string
  appId?: string
  label: string
}

const CHILD_INSTANCE_HEIGHT = 6 * GU
const MENU_PANEL_WIDTH = 18 * GU
const MENU_ROUTES: MenuRoute[] = [
  {
    icon: IconNetwork,
    id: '/home',
    label: 'Network',
  },
  {
    icon: IconApp,
    id: '/apps',
    label: 'Apps',
  },
]
const CREATE_APP_ROUTE = [
  {
    id: '/create',
    label: 'Create',
  },
]

function useActiveRouteName() {
  const { pathname } = useLocation()
  const [activeId, setActiveId] = useState(pathname)

  useEffect(() => {
    const id = pathname

    setActiveId(id)
  }, [pathname])

  return {
    activeId,
  }
}

interface MenuPanelProps {
  appsLoading: boolean
  onMenuPanelClose: () => void
  opened: boolean
  userApps: ILBInfo[]
}

export default function MenuPanel({
  appsLoading = true,
  onMenuPanelClose,
  opened,
  userApps = [],
}: MenuPanelProps) {
  const theme = useTheme()
  const { within } = useViewport()
  const { activeId } = useActiveRouteName()
  const compactMode = within(-1, 'medium')

  const { menuPanelProgress } = useSpring({
    menuPanelProgress: !compactMode || opened ? 1 : 0,
  })

  const instanceGroups = useMemo(() => {
    const groups = [[MENU_ROUTES[0]]]

    groups.push([MENU_ROUTES[1]])

    groups[1].push(
      ...userApps.map(({ name, id }) => ({
        label: name,
        id: `/app/${id}`,
        appId: id,
      }))
    )

    if (!compactMode) {
      groups[1].push(...CREATE_APP_ROUTE)
    }

    return groups
  }, [compactMode, userApps])

  const renderInstanceGroup = useCallback(
    (group) => {
      const activeIndex = group.findIndex(({ id }: { id: string }) =>
        activeId.includes(id)
      )
      const isActive = activeIndex !== -1

      return (
        <MenuPanelGroup
          active={isActive}
          activeIndex={activeIndex}
          appsLoading={appsLoading}
          instances={group}
          key={group[0].id}
        />
      )
    },
    [activeId, appsLoading]
  )

  return (
    <div
      css={`
        ${compactMode &&
        `
          position: absolute;
          width: 100%;
          height: 100%;
          z-index: 3;
          ${!opened ? 'pointer-events: none' : ''}
        `}
      `}
    >
      {compactMode && (
        <animated.div
          onClick={onMenuPanelClose}
          css={`
            position: absolute;
            height: 100%;
            width: 100%;
            background: ${theme.overlay.alpha(0.9)};
            ${!opened ? 'pointer-events: none' : ''}
          `}
          style={{
            opacity: menuPanelProgress as unknown as number,
          }}
        />
      )}
      <animated.div
        css={`
          width: ${MENU_PANEL_WIDTH}px;
          height: 100vh;
          padding: ${2 * GU}px 0;
          flex-grow: 0;
        `}
        style={{
          position: compactMode ? 'absolute' : 'relative',
          transform: menuPanelProgress.interpolate(
            (v) =>
              `translate3d(
                    ${lerp(v as number, -MENU_PANEL_WIDTH, 0)}px, 0, 0)`
          ),
        }}
      >
        <div
          css={`
            width: ${MENU_PANEL_WIDTH}px;
            height: 100vh;
            position: fixed;
            top: 0;
            left: 0;
            padding: ${2 * GU}px 0;
            background: linear-gradient(
              180deg,
              ${theme.surfaceGradient1} 0%,
              ${theme.surfaceGradient2} 100%
            );
            border-radius: 0px 20px 20px 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-grow: 0;
          `}
        >
          <ButtonBase
            css={`
              && {
                width: ${6 * GU}px;
                height: ${6 * GU}px;
                position: relative;
                justify-self: center;
                &:active {
                  top: 1px;
                }
              }
            `}
          >
            <img src={PortalLogo} alt="Menu Icon" />
          </ButtonBase>
          <Spacer size={5 * GU} />
          {instanceGroups.map((group) => renderInstanceGroup(group))}
        </div>
      </animated.div>
    </div>
  )
}

interface MenuPanelGroupProps {
  active: boolean
  activeIndex: number
  appsLoading: boolean
  instances: MenuRoute[]
}

function MenuPanelGroup({
  active,
  appsLoading,
  instances,
}: MenuPanelGroupProps) {
  const { openProgress } = useSpring({
    from: { openProgress: Number(appsLoading) },
    to: { openProgress: Number(active) },
    config: springs.smooth,
  })
  const { pathname } = useLocation()
  const history = useHistory()
  const theme = useTheme()

  const [primaryInstance, ...childInstances] = instances

  const handleInstanceClick = useCallback(() => {
    if (!childInstances.length) {
      history.push({
        pathname: `${primaryInstance.id}`,
      })
      return
    }

    const [nextInstance] = childInstances

    history.push({
      pathname: `${nextInstance.id}`,
    })
  }, [childInstances, history, primaryInstance])

  const activeChildInstanceIndex = childInstances.reduce(
    (activeIndex, { appId }, index) => {
      if (pathname.includes('create')) {
        return childInstances.length - 1
      }

      if (!pathname.includes(appId as string) && activeIndex === -1) {
        return -1
      }

      if (pathname.includes(appId as string)) {
        return index
      }

      if (activeIndex !== -1) {
        return activeIndex
      }

      return -1
    },
    -1
  )

  return (
    <div
      css={`
        position: relative;
        width: 100%;
        min-height: ${10 * GU}px;
        color: ${theme.content};
        display: flex;
        flex-direction: column;
        align-items: center;
      `}
    >
      <animated.div
        css={`
          position: absolute;
          left: 0;
          top: 0;
          width: ${GU / 2}px;
          height: ${11 * GU}px;
          background: ${theme.accent};
          border-radius: ${RADIUS}px;
        `}
        style={{
          opacity: openProgress,
          transform: openProgress.interpolate(
            (v: number) => `translate3d(-${(1 - v) * 100}%, 0, 0)`
          ),
        }}
      />
      <MenuPanelButton
        active={active}
        instance={primaryInstance}
        onClick={handleInstanceClick}
      />
      {childInstances.length ? (
        <animated.ul
          css={`
            overflow: hidden;
            list-style: none;
            width: 100%;
          `}
          style={{
            height: openProgress.interpolate(
              (v: number) =>
                `${childInstances.length * (CHILD_INSTANCE_HEIGHT + GU) * v}px`
            ),
            maxHeight: '400px',
            overflowY: 'scroll',
          }}
        >
          {childInstances.map(({ id, label }, index) => (
            <>
              <Spacer size={1 * GU} />
              <li
                key={id}
                css={`
                  width: 100%;
                `}
              >
                <ButtonBase
                  onClick={() => history.push({ pathname: `${id}` })}
                  css={`
                    && {
                      background: ${activeChildInstanceIndex === index
                        ? `linear-gradient(90.3deg, ${theme.accent} -434.38%, rgba(197, 236, 75, 0) 99.62%)`
                        : 'transparent'};
                      display: flex;
                      align-items: center;
                      border-radius: 0px;
                      text-align: left;
                      height: ${6 * GU}px;
                      width: 100%;
                      font-weight: ${active ? 'bold' : 'normal'};
                      transition: background 150ms ease-in-out;
                    }
                  `}
                >
                  <span
                    css={`
                      width: 100%;
                      overflow: hidden;
                      white-space: nowrap;
                      text-overflow: ellipsis;
                      text-align: center;
                    `}
                  >
                    {shorten(label, 10)}
                  </span>
                </ButtonBase>
              </li>
            </>
          ))}
        </animated.ul>
      ) : (
        ''
      )}
    </div>
  )
}

interface MenuPanelButtonProps {
  active: boolean
  instance: MenuRoute
  onClick: () => void
}

function MenuPanelButton({
  active,
  instance,
  onClick,
  ...props
}: MenuPanelButtonProps) {
  const theme = useTheme()

  const InstanceIcon = instance.icon

  return (
    <ButtonBase
      css={`
        && {
          background: ${active
            ? `linear-gradient(90.3deg, ${theme.accent} -434.38%, rgba(197, 236, 75, 0) 99.62%)`
            : 'transparent'};
          width: 100%;
          height: ${11 * GU}px;
          padding-top: ${1 * GU}px;
          border-radius: 0px;
          color: ${theme.content};
          transition: background 150ms ease-in-out;
        }
      `}
      onClick={onClick}
      {...props}
    >
      <div
        css={`
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          img {
            display: block;
            width: ${5 * GU}px;
            height: ${5 * GU}px;
          }
        `}
      >
        <InstanceIcon color={theme.content} />
        <Spacer size={1 * GU} />
        {instance.label}
      </div>
    </ButtonBase>
  )
}
