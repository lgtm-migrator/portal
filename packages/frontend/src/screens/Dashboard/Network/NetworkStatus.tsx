import React, {
  useMemo,
  useState,
  useCallback,
  useContext,
  useEffect,
} from 'react'
import { format } from 'd3-format'
import { useViewport } from 'use-viewport'
import 'styled-components/macro'
import { useAuth0 } from '@auth0/auth0-react'
import {
  ButtonBase,
  CircleGraph,
  DataView,
  Help,
  LineChart,
  Spacer,
  Split,
  textStyle,
  useTheme,
  GU,
  RADIUS,
  TextInput,
  IconSearch,
} from '@pokt-foundation/ui'
import AnimatedLogo from '../../../components/AnimatedLogo/AnimatedLogo'
import FloatUp from '../../../components/FloatUp/FloatUp'
import { getImageForChain } from '../../../known-chains/known-chains'
import {
  DailyRelayBucket,
  useChains,
  useNetworkStats,
  useNetworkSummary,
  usePoktScanLatestBlockAndPerformance,
  useTotalWeeklyRelays,
} from '../../../hooks/network-hooks'
import Economics from '../../../assets/economicsDevs.png'
import {
  getServiceLevelByChain,
  ALPHA_CHAINS,
  PRODUCTION_CHAINS,
  Chain,
} from '../../../lib/chain-utils'
import { norm } from '../../../lib/math-utils'
import NetworkSummaryNodesImg from '../../../assets/networkSummaryNodes.png'
import NetworkSummaryAppsImg from '../../../assets/networkSummaryApps.png'
import NetworkSummaryNetworksImg from '../../../assets/networkSummaryNetworks.png'
import Card from '../../../components/Card/Card'
import FeedbackBox from '../../../components/FeedbackBox/FeedbackBox'
import { FlagContext } from '../../../contexts/flagsContext'
import env from '../../../environment'
import LatestBlock from '../../../components/LatestBlock/LatestBlock'
import Performance from '../../../components/Performance/Performance'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const PER_PAGE = 5

function formatDailyRelaysForGraphing(dailyRelays: DailyRelayBucket[] = []): {
  labels: string[]
  lines: { id: number; values: number[] }[]
  scales: { label: number }[]
} {
  dailyRelays.pop()
  const labels = dailyRelays
    .map(({ bucket }) => bucket.split('T')[0])
    .map((bucket) => DAYS[new Date(bucket).getUTCDay()])

  const highestDailyAmount = dailyRelays.reduce(
    (highest, { total_relays: totalRelays }) => Math.max(highest, totalRelays),
    0
  )

  const lines = [
    {
      id: 1,
      values: dailyRelays.map(({ total_relays: totalRelays }) =>
        norm(totalRelays, 0, highestDailyAmount)
      ),
    },
  ]

  const formatSi = format('.2s')

  const scales = [
    { label: 0 },
    { label: formatSi((highestDailyAmount * 0.25).toFixed(0)) },
    { label: formatSi((highestDailyAmount * 0.5).toFixed(0)) },
    { label: formatSi((highestDailyAmount * 0.75).toFixed(0)) },
    { label: formatSi(highestDailyAmount.toFixed(0)) },
  ]

  return {
    labels,
    lines,
    scales,
  }
}

export default function NetworkStatus() {
  const { isNetworkStatsLoading, networkStats } = useNetworkStats()
  const { isRelaysError, isRelaysLoading, relayData } = useTotalWeeklyRelays()
  const { isSummaryLoading, summaryData } = useNetworkSummary()
  const { isChainsLoading, chains } = useChains()
  const [accessToken, setAccessToken] = useState('')
  const {
    isPoktScanLatestBlockAndPerformanceError,
    isPoktScanLatestBlockAndPerformanceLoading,
    latestBlockAndPerformance,
  } = usePoktScanLatestBlockAndPerformance()
  const theme = useTheme()
  const { within } = useViewport()
  const compactMode = within(-1, 'medium')
  const { flags, updateFlag } = useContext(FlagContext)

  const { getAccessTokenSilently } = useAuth0()

  useEffect(() => {
    if (flags.useAuth0) {
      const getAccessToken = async () => {
        const accessToken = await getAccessTokenSilently({
          audience: env('AUTH0_AUDIENCE') as string,
          scope: env('AUTH0_SCOPE') as string,
        })

        setAccessToken(accessToken)
        updateFlag({
          authHeaders: { headers: { Authorization: `Bearer ${accessToken}` } },
        })
      }
      getAccessToken()
    }
  }, [])

  const {
    labels = [],
    lines = [],
    scales = [],
  } = useMemo(
    () =>
      isRelaysLoading || isRelaysError || relayData === undefined
        ? { labels: [], scales: [], lines: [] }
        : formatDailyRelaysForGraphing(relayData),
    [isRelaysError, isRelaysLoading, relayData]
  )

  const loading = useMemo(
    () =>
      isNetworkStatsLoading ||
      isRelaysLoading ||
      isSummaryLoading ||
      isChainsLoading ||
      !networkStats,
    [
      networkStats,
      isChainsLoading,
      isRelaysLoading,
      isNetworkStatsLoading,
      isSummaryLoading,
    ]
  )

  return (flags.useAuth0 ? !accessToken : null) || loading || !networkStats ? (
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
        Loading network status...
      </p>
    </div>
  ) : (
    <FloatUp
      content={() => (
        <>
          <Split
            primary={
              <>
                <h3
                  css={`
                    ${textStyle('title3')};
                    margin-bottom: ${GU * 3}px;
                  `}
                >
                  Network Summary
                </h3>
                <div
                  css={`
                    display: flex;
                    justify-content: space-evenly;
                    margin-bottom: ${GU * 4}px;
                  `}
                >
                  <NetworkSummaryCard
                    title="Nodes Staked"
                    subtitle="7000+"
                    imgSrc={NetworkSummaryNodesImg}
                  />
                  <NetworkSummaryCard
                    title="Apps Staked"
                    subtitle={`${summaryData?.appsStaked}`}
                    imgSrc={NetworkSummaryAppsImg}
                  />
                  <NetworkSummaryCard
                    title="Networks"
                    subtitle={`${chains?.length}`}
                    imgSrc={NetworkSummaryNetworksImg}
                  />
                </div>
                <Card
                  css={`
                    padding: ${GU * 3}px;
                  `}
                >
                  <LineChart
                    backgroundFill="#1B2331"
                    borderColor={`rgba(0,0,0,0)`}
                    color={() => theme.accentAlternative}
                    dotRadius={GU / 1.5}
                    height={240}
                    label={(index: number) => labels[index]}
                    lines={lines}
                    renderCheckpoints
                    scales={scales}
                    dotColor={theme.accent}
                    renderVerticalCheckLines
                    renderHorizontalCheckLines
                    renderBackground
                    css={`
                      circle {
                        filter: drop-shadow(
                          0px 0px 4px rgba(197, 236, 75, 0.3)
                        );
                      }

                      path {
                        stroke-width: 5;
                      }
                    `}
                  />
                  <Spacer size={3 * GU} />

                  <div
                    css={`
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                    `}
                  >
                    <h3
                      css={`
                        ${textStyle('title3')}
                      `}
                    >
                      Total Relays:
                    </h3>

                    <div
                      css={`
                        text-align: right;
                      `}
                    >
                      <h4
                        css={`
                          ${textStyle('title2')}
                          color: ${theme.accentAlternative};
                        `}
                      >
                        {Intl.NumberFormat().format(
                          networkStats?.totalRelays || 0
                        )}
                      </h4>
                      <h5
                        css={`
                          ${textStyle('body4')}
                        `}
                      >
                        Last 7 Days
                      </h5>
                    </div>
                  </div>
                </Card>
                <Spacer size={4 * GU} />
                <AvailableNetworks chains={chains} />
                {!compactMode && <Spacer size={3 * GU} />}
              </>
            }
            secondary={
              <>
                <h3
                  css={`
                    ${textStyle('title3')};
                    margin-bottom: ${GU * 3}px;
                    font-weight: 700;
                  `}
                >
                  Network Success Rate
                </h3>

                <Card
                  css={`
                    padding: ${GU * 3}px ${GU * 4}px;
                  `}
                >
                  <div
                    css={`
                      display: flex;
                      justify-content: space-between;
                      ${compactMode &&
                      `
                        flex-direction: row;
                       justify-content: space-between;
                      `}
                    `}
                  >
                    <CircleGraph
                      size={compactMode ? 10 * GU : 10 * GU}
                      strokeWidth={GU * 1.5}
                      value={
                        networkStats.successfulRelays / networkStats.totalRelays
                      }
                      color="url(#network-success-gradient)"
                    >
                      <defs>
                        <linearGradient id="network-success-gradient">
                          <stop
                            offset="10%"
                            stop-opacity="100%"
                            stop-color={theme.accentSecondAlternative}
                          />
                          <stop
                            offset="90%"
                            stop-opacity="100%"
                            stop-color={theme.accent}
                          />
                        </linearGradient>
                      </defs>
                    </CircleGraph>

                    <div
                      css={`
                        display: flex;
                        flex-direction: column;
                        align-items: end;
                      `}
                    >
                      <p
                        css={`
                          ${textStyle('title2')}
                        `}
                      >
                        {Intl.NumberFormat().format(
                          networkStats.successfulRelays
                        )}
                      </p>
                      <p
                        css={`
                          ${textStyle('body3')}
                          color: ${theme.placeholder};
                          position: relative;
                        `}
                      >
                        <span
                          css={`
                            width: 10px;
                            height: 10px;
                            border-radius: 10px;
                            background: ${theme.accent};
                            position: absolute;
                            filter: blur(4px);
                            top: 5px;
                          `}
                        />
                        <svg
                          viewBox="0 0 10 10"
                          xmlns="http://www.w3.org/2000/svg"
                          width="10"
                          height="10"
                          css={`
                            margin-right: ${GU}px;
                          `}
                        >
                          <circle cx="5" cy="5" r="5" fill={theme.accent} />
                        </svg>
                        Successful relays
                      </p>
                      <Spacer size={0.5 * GU} />
                      <p
                        css={`
                          ${textStyle('body4')}
                          color: ${theme.placeholder};
                        `}
                      >
                        Last 7 Days
                      </p>
                    </div>
                  </div>
                </Card>
                <Spacer size={4 * GU} />
                <LatestBlock
                  isPoktScanLatestBlockAndPerformanceError={
                    isPoktScanLatestBlockAndPerformanceError
                  }
                  isPoktScanLatestBlockAndPerformanceLoading={
                    isPoktScanLatestBlockAndPerformanceLoading
                  }
                  latestBlockAndPerformance={latestBlockAndPerformance}
                />
                <Spacer size={3 * GU} />
                <Performance
                  isPoktScanLatestBlockAndPerformanceError={
                    isPoktScanLatestBlockAndPerformanceError
                  }
                  isPoktScanLatestBlockAndPerformanceLoading={
                    isPoktScanLatestBlockAndPerformanceLoading
                  }
                  latestBlockAndPerformance={latestBlockAndPerformance}
                />
                {!compactMode && (
                  <>
                    <Spacer size={4 * GU} />
                    <EconomicsSection />
                  </>
                )}
                <Spacer size={4 * GU} />
                <FeedbackBox />
              </>
            }
          />
        </>
      )}
    />
  )
}

function EconomicsSection() {
  const theme = useTheme()

  return (
    <section
      css={`
        position: relative;
        width: 100%;
        height: 100%;
        max-height: ${33 * GU}px;
        background: url(${Economics}),
          linear-gradient(
            180deg,
            ${theme.surfaceGradient1} 0%,
            ${theme.surfaceGradient2} 100%
          );
        background-size: cover;
        background-repeat: no-repeat;
        background-blend-mode: overlay;
        background-position: bottom;
        border-radius: ${RADIUS + 2}px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      `}
    >
      <h3
        css={`
          font-weight: 700;
        `}
      >
        Pocket Economics for{' '}
        <span
          css={`
            color: ${theme.accentAlternative};
            ${textStyle('title2')};
            display: block;
          `}
        >
          {' '}
          App Developers
        </span>
      </h3>
      <ButtonBase
        href="https://medium.com/pocket-network/pocket-economics-for-app-developers-487a6ce290c2"
        mode="normal"
        css={`
          && {
            width: ${28 * GU}px;
            display: inline-block;
            ${textStyle('body3')};
            line-height: ${0 * GU}px;
            font-weight: bold;
            height: ${5 * GU}px;
            padding: ${3 * GU}px;
            background: transparent;
            border: 2px solid ${theme.contentBorder};
            color: ${theme.surfaceContent};
            border: '0';
            margin-top: ${GU * 4}px;
          }
        `}
      >
        Read More
      </ButtonBase>
    </section>
  )
}

interface NetworkSummaryCardProps {
  title: string
  subtitle: string
  imgSrc: string
}

function NetworkSummaryCard({
  imgSrc,
  subtitle,
  title,
}: NetworkSummaryCardProps) {
  const theme = useTheme()

  return (
    <Card
      css={`
        display: flex;
        justify-content: space-between;
        width: ${GU * 28}px;
        height: ${GU * 16}px;
        margin-right: ${GU * 2}px;
      `}
    >
      <div
        css={`
          display: flex;
          flex-direction: column;
          margin-left: ${GU * 3}px;
        `}
      >
        <h3
          css={`
            color: ${theme.disabledContent};
            ${textStyle('title4')};
          `}
        >
          {title}
        </h3>
        <p
          css={`
            ${textStyle('title2')};
            margin-top: auto;
          `}
        >
          {subtitle}
        </p>
      </div>
      <img
        src={imgSrc}
        alt="network summary nodes"
        css={`
          width: 86px;
          height: 90px;
        `}
      />
    </Card>
  )
}

interface AvailableNetworksProps {
  chains: Chain[] | undefined
}

function AvailableNetworks({ chains }: AvailableNetworksProps) {
  const { within } = useViewport()
  const compactMode = within(-1, 'medium')
  const theme = useTheme()
  const [internalChains, setInternalChains] = useState(chains)
  const [chainName, setChainName] = useState('')

  const handleChainsSearch = useCallback(
    (searchedChain: string) => {
      setChainName(searchedChain)

      if (searchedChain.length === 0) {
        setInternalChains(chains)
      }

      const tempChains = []

      if (chains) {
        for (const chain of chains) {
          if (
            chain.description
              .toLowerCase()
              .includes(searchedChain.toLowerCase())
          ) {
            tempChains.push(chain)
          }
        }
      }
      setInternalChains(tempChains)
    },
    [chains]
  )

  return (
    <Card
      css={`
        padding: ${GU * 3}px;
      `}
    >
      <div>
        <div
          css={`
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
          `}
        >
          <h3
            css={`
              margin: 0 0 ${GU * 5}px ${GU * 3}px;
              font-size: ${GU * 2 + 2}px;
              font-weight: 700;
            `}
          >
            Available Networks
          </h3>
          <TextInput
            value={chainName}
            placeholder="Pocket Network"
            adornment={<IconSearch />}
            adornmentPosition={'start'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleChainsSearch(e.target.value)
            }
            css={`
              height: ${GU * 4}px;
              width: ${compactMode ? '100%' : '380px'};
              background: transparent;
              padding-left: ${GU * 6}px;

              & + div {
                height: ${GU * 4}px;

                & svg {
                  width: ${GU * 2}px;
                  height: ${GU * 2}px;
                  color: ${theme.accentContent};
                }
              }
            `}
          />
        </div>
        <DataView
          fields={[
            { label: 'Network', align: 'start' },
            { label: 'Apps', align: 'start' },
            { label: 'ID', align: 'start' },
            { label: 'Status', align: 'start' },
          ]}
          entries={internalChains}
          mode={compactMode ? 'list' : 'table'}
          entriesPerPage={PER_PAGE}
          renderEntry={({ appCount, description, id, network }: Chain) => {
            const chainImage = getImageForChain(description)

            return [
              <div
                css={`
                  height: 100%;
                  width: ${35 * GU}px;
                  display: flex;
                  justify-content: flex-start;
                  align-items: center;
                `}
              >
                <img
                  src={chainImage}
                  css={`
                    max-height: ${2 * GU}px;
                    max-width: auto;
                  `}
                  alt=""
                />
                <Spacer size={compactMode ? 1 * GU : 2 * GU} />
                <p
                  css={`
                    overflow-wrap: break-word;
                    word-break: break-word;
                    hyphens: auto;
                  `}
                >
                  {description || network}
                </p>
              </div>,
              <p>{appCount ?? 0}</p>,
              <p>{id}</p>,
              <div
                css={`
                  display: flex;
                  flex-direction: row;
                  ${!compactMode &&
                  `
              align-items: center;
              justify-content: center;
            `}
                `}
              >
                <p>{getServiceLevelByChain(id)}</p>
                <Spacer size={1 * GU} />
                <Help
                  hint="What is this?"
                  placement={compactMode ? 'auto' : 'right'}
                >
                  {PRODUCTION_CHAINS.includes(id)
                    ? 'Production RelayChainIDs are very stable and thoroughly tested.'
                    : ''}
                  {ALPHA_CHAINS.includes(id)
                    ? 'Alpha RelayChainIDs are in the earliest phase of node onboarding and testing. Users may encounter issues, higher than production latency, or some quality of service issues. '
                    : ''}
                  {!PRODUCTION_CHAINS.includes(id) && !ALPHA_CHAINS.includes(id)
                    ? 'Beta RelayChainIDs are in the process of being externally tested. Users may encounter edge case issues, higher than production latency, or some brief quality of service issues. '
                    : ''}
                </Help>
              </div>,
            ]
          }}
        />
      </div>
    </Card>
  )
}
