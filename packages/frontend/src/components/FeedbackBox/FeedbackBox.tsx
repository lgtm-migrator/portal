import { useState } from 'react'
import 'styled-components/macro'
import styled from 'styled-components'
import { textStyle, GU, IconUp, IconDown } from '@pokt-foundation/ui'
import { useSpring, animated } from 'react-spring'
import axios from 'axios'
import * as Sentry from '@sentry/react'
import env from '../../environment'
import { sentryEnabled } from '../../sentry'

const ShareFeedback = '/assets/share-feedback.svg'
const heart = '/assets/heart.svg'

const FeedBackBox = styled.div`
  background-color: #192430;
  border-radius: 10px;
  padding: ${3 * GU}px;
`

const TopFlexBox = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`

const OpenCloseButton = styled.button`
  background-color: transparent;
  border: 1px solid #c5ec4b;
  width: 32px;
  height: 32px;
  color: #c5ec4b;
  border-radius: 4px;
  padding-bottom: 5px;
  font-weight: bold;
  padding: 3px;
`

const StyledImage = styled.img`
  margin-right: ${1 * GU}px;
`

const SpaceHolderDiv = styled.div`
  min-width: 24px;
`

const Title = styled.h3`
  ${textStyle('title3')}
`

const BodyText = styled.p`
  ${textStyle('body4')}
`

const StyledTextArea = styled.textarea`
  width: 100%;
  padding: ${1 * GU}px ${2.5 * GU}px;
  font-size: 12px;
  min-height: calc(5 * 16px);
  color: white;
  background: transparent;
  border-radius: 4px;
  border: 1px solid #fafafa;
  resize: vertical;
  && ::placeholder {
    color: #898d92;
  }
  && ::-webkit-resizer {
    background: url('/assets/resizer.svg');
  }
`

const SubmitButton = styled.button`
  background: #c5ec4b;
  border-radius: 8px;
  border: none;
  height: 40px;
  width: 100px;
  align-self: flex-end;
  font-weight: 600;
  font-size: 14px;
  color: #212121;
`

const FlexRow = styled.div`
  display: flex;
  flex-direction: row;
`

export default function FeedbackBox({ className }: { className?: string }) {
  const [submitted, setSubmitted] = useState(false)
  const [open, setOpen] = useState(false)
  const [textArea, setTextArea] = useState<
    string | number | readonly string[] | undefined
  >('')

  async function submitHandler() {
    try {
      const path = `${env('BACKEND_URL')}/api/users/feedback`

      await axios.post(path, {
        feedback: textArea?.toString(),
        location: window?.location?.href || 'Unknown Portal Page',
        pageTitle: document?.title || 'Unknown page Title',
      })
    } catch (err) {
      if (sentryEnabled) {
        Sentry.captureException(err)
      }

      throw err
    }

    setSubmitted(!submitted)
    setOpen(!open)
    setTextArea('')
  }

  const divStyles = useSpring({
    opacity: open ? 1 : 0,
    display: 'flex',
    flexDirection: 'column',
    paddingTop: `${2 * GU}px`,
  })

  return (
    <FeedBackBox>
      {submitted ? (
        <TopFlexBox className={className}>
          <FlexRow>
            <SpaceHolderDiv>
              <StyledImage
                css={`
                  padding-top: 5px;
                `}
                src={heart}
                aria-hidden="true"
              />
            </SpaceHolderDiv>
            <div>
              <Title>Thanks</Title>
              <BodyText>For your feedback!</BodyText>
            </div>
          </FlexRow>
          <OpenCloseButton
            type="button"
            onClick={() => {
              setSubmitted(!submitted)
            }}
          >
            x
          </OpenCloseButton>
        </TopFlexBox>
      ) : (
        <>
          <TopFlexBox className={className}>
            <FlexRow>
              <SpaceHolderDiv>
                <StyledImage src={ShareFeedback} aria-hidden="true" />
              </SpaceHolderDiv>
              <div>
                <Title>Share Feedback</Title>
                <BodyText>Help us to improve Pocket Portal</BodyText>
              </div>
            </FlexRow>
            <OpenCloseButton
              type="button"
              aria-label={
                open
                  ? 'Click to close feedback box'
                  : 'Click to open feedback box'
              }
              title={
                open
                  ? 'Click to close feedback box'
                  : 'Click to open feedback box'
              }
              onClick={() => {
                setOpen(!open)
              }}
            >
              {open ? <IconUp /> : <IconDown />}
            </OpenCloseButton>
          </TopFlexBox>

          {open && (
            <animated.div style={divStyles}>
              <StyledTextArea
                placeholder="Would be interesting to..."
                value={textArea}
                onChange={(e) => {
                  setTextArea(e.target.value)
                }}
              />
              <BodyText
                css={`
                  margin-bottom: ${2 * GU}px;
                  padding-top: ${1 * GU}px;
                `}
              >
                Do not share any personal info
              </BodyText>
              <SubmitButton
                type="button"
                aria-label="Submit feedback"
                title="Submit feedback"
                onClick={() => {
                  submitHandler()
                }}
              >
                Submit
              </SubmitButton>
            </animated.div>
          )}
        </>
      )}
    </FeedBackBox>
  )
}
