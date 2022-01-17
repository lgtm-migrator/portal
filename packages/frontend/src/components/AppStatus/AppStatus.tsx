import TokenAmount from 'token-amount'
import { useViewport } from 'use-viewport'
import { Help, Spacer, Tag, textStyle, GU } from '@pokt-foundation/ui'
import 'styled-components/macro'
import Box from '../Box/Box'

interface AppStatusProps {
  stakedTokens: number
  maxDailyRelays: number
}

export default function AppStatus({
  stakedTokens,
  maxDailyRelays,
}: AppStatusProps) {
  const { within } = useViewport()

  const compactMode = within(-1, 'medium')

  return (
    <Box
      css={`
        display: flex;
        justify-content: center;
        align-items: center;
      `}
    >
      <ul
        css={`
          list-style: none;
          height: 100%;
          width: 100%;
          li {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            ${textStyle('body1')}
            font-weight: 600;
            span {
              font-weight: 400;
            }
          }
        `}
      >
        <li>
          App Status
          <Tag mode="new" uppercase={false} color="white" background="#1A4008">
            <span
              css={`
                display: flex;
                justify-content: center;
                align-items: center;
              `}
            >
              Staked&nbsp;
              <Help
                hint="What does this mean?"
                placement={compactMode ? 'auto' : 'left'}
              >
                All the free tier apps have already been staked and ready to
                send relays
              </Help>
            </span>
          </Tag>
        </li>
        <Spacer size={2 * GU} />
        <li>
          Staked Amount
          <span
            css={`
              ${textStyle('body3')}
            `}
          >
            {TokenAmount.format(stakedTokens, 6, {
              symbol: 'POKT',
            })}
          </span>
        </li>
        <Spacer size={2 * GU} />
        <li>
          Max Relays Per Day
          <span
            css={`
              ${textStyle('body3')}
            `}
          >
            {new Intl.NumberFormat('en-US', {
              notation: 'compact',
              compactDisplay: 'short',
            }).format(maxDailyRelays)}
          </span>
        </li>
      </ul>
    </Box>
  )
}
