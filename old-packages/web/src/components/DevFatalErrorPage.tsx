// This file is a hard fork of panic-overlay for RedwoodJS. The original code
// is licensed under The Unlicense - https://github.com/xpl/panic-overlay/blob/master/LICENSE
// making it fine for embedding inside this project.

// Stacktracey requires buffer, which Vite does not polyfill by default
import React, { useState } from 'react'

import type { GraphQLError } from 'graphql'
import StackTracey from 'stacktracey'

// RWJS_SRC_ROOT is defined and defaulted in vite to the base path
let srcRoot = ''
if (typeof RWJS_DEBUG_ENV !== 'undefined') {
  srcRoot = RWJS_DEBUG_ENV?.RWJS_SRC_ROOT
}

let appRoot: string

if (/^[A-Z]:\\/.test(srcRoot)) {
  // On Windows srcRoot will be something like C:\Users\bob\dev\rwApp
  appRoot = srcRoot.substring(3).replace(/\\/g, '/')
} else {
  // On Linux/MacOS srcRoot will be something like /Users/bob/dev/rwApp
  appRoot = srcRoot.substring(1)
}

type RequestDetails = {
  query: string
  operationName: string
  operationKind: string
  variables: any
}

interface EnhancedGqlError extends GraphQLError {
  __RedwoodEnhancedError: RequestDetails
}

// Allow APIs client to attach response/request
type ErrorWithRequestMeta = Error & {
  mostRecentRequest?: RequestDetails
  graphQLErrors: EnhancedGqlError[]
  mostRecentResponse?: any
}

export const DevFatalErrorPage = (props: { error?: ErrorWithRequestMeta }) => {
  // Safety fallback
  if (!props.error) {
    return (
      <h3>
        Could not render the error page due to a missing error, please see the
        console for more details.
      </h3>
    )
  }

  const err = props.error
  const stack = new StackTracey(err).withSources()

  const typeName = String(
    (err as any)['type'] || err.constructor?.name || typeof err,
  )
  const msg = String(err && err.message)

  const FileRef = stack.items[0] ? (
    <a href={toVSCodeURL(stack.items[0])}>{stack.items[0].fileName}</a>
  ) : null

  return (
    <main className="error-page">
      <style
        dangerouslySetInnerHTML={{
          __html: css,
        }}
      />

      <nav>
        <h1>A fatal runtime error occurred when rendering {FileRef}</h1>
        <div>
          Get help via <Discord /> or <Discourse />
        </div>
      </nav>

      <section className="panic-overlay">
        <div className="error">
          <h3 className="error-title">
            <span className="error-type">{typeName}</span>
            <span className="error-message">{prettyMessage(msg)}</span>
          </h3>
          <div className="error-stack">
            {stack.items.map((entry, i) => (
              <StackEntry key={i} entry={entry} i={i} message={msg} />
            ))}
          </div>
        </div>
        <ResponseRequest error={props.error} />
      </section>
    </main>
  )
}

function hideStackLine(fileReference: string): boolean {
  return (
    fileReference.length === 1 ||
    fileReference.includes('node_modules/react-dom')
  )
}

function StackEntry({
  entry,
  i,
}: {
  entry: StackTracey.Entry
  i: number
  message: string
}) {
  const { sourceFile = { lines: [] }, line, column, fileShort } = entry

  const lineIndex = (line || 0) - 1
  const maxLines = sourceFile.lines.length
  const window = 4

  let start = lineIndex - window,
    end = lineIndex + window + 2

  if (start < 0) {
    end = Math.min(end - start, maxLines)
    start = 0
  }
  if (end > maxLines) {
    start = Math.max(0, start - (end - maxLines))
    end = maxLines
  }

  const lines = sourceFile.lines.slice(start, end)
  const lineNumberWidth = String(start + lines.length).length
  const highlightIndex = (line || 0) - start - 1
  const onLastLine = highlightIndex === lines.length - 1

  const shortestPath = (path: string) => path.replace(appRoot || '', '')
  const expanded = !shouldHideEntry(entry, i)

  const clickable = lines.length
  const LinkToVSCode = (props: { children: any }) =>
    clickable ? (
      <a href={toVSCodeURL(entry)}>{props.children}</a>
    ) : (
      <>{props.children}</>
    )
  const fileReference = !lines.length ? '[System]' : shortestPath(fileShort)

  const rootClasses = [
    'stack-entry',
    !fileReference.includes('node_modules') && 'rwfw',
    i === 0 && ' first',
    lines.length && 'clickable',
  ].filter(Boolean)

  return hideStackLine(fileReference) ? (
    <div></div>
  ) : (
    <LinkToVSCode>
      <div className={rootClasses.join(' ')}>
        <div className="file">{fileReference + ' in ' + entry.callee}</div>
        {expanded && !!lines.length && (
          <div className={'lines' + (onLastLine ? '.no-fade' : '')}>
            {lines.map((text, i) => {
              return (
                <div
                  key={i}
                  className={
                    'line' + (i === highlightIndex ? ' line-hili' : '')
                  }
                >
                  <span className="line-number">
                    {String(start + i + 1).padStart(lineNumberWidth, ' ')}
                  </span>
                  <span className="line-text">
                    {i === highlightIndex
                      ? renderHighlightedLine(text, column || 0)
                      : text}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </LinkToVSCode>
  )

  function renderHighlightedLine(text: string, column: number) {
    const [before, after] = [text.slice(0, column - 1), text.slice(column - 1)]
    return (
      <>
        {before}
        <strong>{after}</strong>
      </>
    )
  }

  function shouldHideEntry(entry: StackTracey.Entry, i: number) {
    return (
      (entry.thirdParty ||
        entry['native'] ||
        entry.hide ||
        entry.fileShort.includes('node_modules')) &&
      i !== 0
    )
  }
}

function toVSCodeURL(entry: StackTracey.Entry) {
  // To account for folks using vscode-insiders etc
  // This is defined by vite from .env
  const scheme = RWJS_DEBUG_ENV.REDWOOD_ENV_EDITOR || 'vscode'
  return `${scheme}://file/${entry.fileShort}:${entry.line}:${entry.column}`
}

function prettyMessage(msg: string) {
  // This could slowly get build out with more cases for improving whitespace/readability
  // over time. There's probably a function like this in react-error-overlay
  return msg.replace('is not a function.', 'is not a function.\n\n')
}

function ResponseRequest(props: { error: ErrorWithRequestMeta }) {
  const [openQuery, setOpenQuery] = useState(false)
  const [openResponse, setOpenResponse] = useState(false)

  if (!props.error) {
    return null
  }

  const mostRecentRequest =
    props.error.mostRecentRequest ||
    props.error.graphQLErrors?.find((gqlErr) => gqlErr.__RedwoodEnhancedError)
      ?.__RedwoodEnhancedError

  // Does not exist with Suspense Cells
  const mostRecentResponse = props.error.mostRecentResponse

  return (
    <div className="request-response">
      {mostRecentRequest ? (
        <div>
          <h4>Request: {mostRecentRequest.operationName}</h4>
          <div>
            <h5>Variables:</h5>
            <code>
              <pre>
                {JSON.stringify(mostRecentRequest.variables, null, '  ')}
              </pre>
            </code>
          </div>
          <div>
            <h5>Query:</h5>
            <code>
              <pre
                onClick={() => setOpenQuery(!openQuery)}
                className={openQuery ? 'open' : 'preview'}
              >
                {mostRecentRequest.query}
              </pre>
            </code>
          </div>
        </div>
      ) : null}
      {mostRecentResponse ? (
        <div className="response">
          <h4>Response</h4>
          <div>
            <h5>JSON:</h5>
            <code>
              <pre
                onClick={() => setOpenResponse(!openResponse)}
                className={openResponse ? 'open' : 'preview'}
              >
                {JSON.stringify(mostRecentResponse, null, '  ')}
              </pre>
            </code>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const css = `
body {
  background-color: rgb(253, 248, 246) !important;
  font-family: "Open Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif  !important;
}

.panic-overlay {
  background-color: white;
  padding: 0 2.5em;
}

.panic-overlay strong {
  font-weight: bold;
}

main.error-page nav {
  display: flex;
  flex-direction: row;
  align: center;
  justify-content: space-between;
  padding: 1em 2.5em;
}

main.error-page  nav h1 {
  color: black;
  margin: 0;
  padding: 0;
  font-size: 1.2em;
  font-weight: 400;
  opacity: 1;
  color: rgb(191, 71, 34);
}

main.error-page nav h1 a {
  color: black;
  text-decoration: underline;
}

main.error-page nav div {
  display: flex;
  align-items: center;
  line-height: 2em;
}

main.error-page nav div a {
  display: flex;
  margin: 0 0.3em;
}

main.error-page nav svg {
  width: 24px;
  height: 24px;
  fill: rgb(191, 71, 34);
}

main.error-page nav svg.discourse {
  height: 20px;
  width: 20px;
}

main.error-page nav svg:hover {
  fill: rgb(200, 32, 32);
}

.request-response div div code,
.request-response div div pre {
  background-color: transparent !important;
}

.panic-overlay a {
  text-decoration: none;
}

.panic-overlay .error {
  padding: 3em 0;
}

.panic-overlay .error-title {
  display: flex;
  align-items: stretch;
}

.panic-overlay .error-type {
  min-height: 2.8em;
  display: flex !important;
  align-items: center;
  padding: 0 1em;
  background: rgb(195, 74, 37);
  color: white;
  margin-right: 2em;
  white-space: nowrap;
  text-align: center;
}
.panic-overlay .error-counter {
  color: white;
  opacity: 0.3;
  position: absolute;
  left: 0.8em;
}
.panic-overlay .error-message {
  display: flex !important;
  align-items: center;
  font-weight: 300;
  line-height: 1.1em;
  font-size: 2.8em;
  word-break: break-all;
  white-space: pre-wrap;
}
.panic-overlay .error-stack {
  margin-top: 2em;
  white-space: pre;
  padding-left: var(--left-pad);
}

.panic-overlay .stack-entry.clickable {
  cursor: pointer;
}

.panic-overlay .stack-entry {
  margin-left: 2.5em;
}

.panic-overlay .stack-entry.rwfw {
  font-weight: bold;
}

.panic-overlay .stack-entry .file {
  color: rgb(195, 74, 37, 0.8);
}

.panic-overlay .stack-entry.first .file {
  font-weight: bold;
  color: rgb(200, 47, 47);
}

.panic-overlay .file strong {
  font-weight: normal;
}
.panic-overlay .file:before,
.panic-overlay .more:before {
  content: "@ ";
  opacity: 0.5;
  margin-left: -1.25em;
}
.panic-overlay .more:before {
  content: "▷ ";
  opacity: 0.5;
}
.panic-overlay .more {
  opacity: 0.25;
  color: black;
  font-size: 0.835em;
  cursor: pointer;
  text-align: center;
  display: none;
}
.panic-overlay .more em {
  font-style: normal;
  font-weight: normal;
  border-bottom: 1px dashed black;
}
.panic-overlay .collapsed .panic-overlay .more {
  display: block;
}
.panic-overlay .lines, .request-response code {
  color: rgb(187, 165, 165);
  font-size: 0.835em;
  margin-bottom: 2.5em;
  padding: 2rem;
  font-family: Menlo, Monaco, "Courier New", Courier, monospace;
}
.panic-overlay .lines:not(.panic-overlay .no-fade) {
  -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 75%, rgba(0, 0, 0, 0));
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 75%, rgba(0, 0, 0, 0));
}
.panic-overlay .line-number {
  padding-right: 1.5em;
  opacity: 0.5;
}
.panic-overlay .line-hili {
  background: rgb(253, 248, 246);
  color: #5f4545;
}
.panic-overlay .stack-entry:first-child .panic-overlay .line-hili strong {
  text-decoration: underline wavy #ff0040;
}
.panic-overlay .line-hili em {
  font-style: italic;
  color: rgb(195, 74, 37);
  font-size: 0.75em;
  margin-left: 2em;
  opacity: 0.25;
  position: relative;
  top: -0.115em;
  white-space: nowrap;
}
.panic-overlay .line-hili em:before {
  content: "← ";
}
.panic-overlay .no-source {
  font-style: italic;
}

.panic-overlay .request-response {
  margin-top: 2rem;
  display: flex;
  flex-direction: row;
}

.panic-overlay .request-response > div {
  flex: 1;
}

.panic-overlay .request-response .response {
  margin-left: 2rem;
}

.panic-overlay .request-response h4 {
  background-color: rgb(195, 74, 37);
  color: white;
  font-size: 1.5rem;
  padding: 0.2rem 1rem;
}

.panic-overlay .request-response > div > div {
  margin: 1rem 1rem;
}

.panic-overlay .request-response pre {
  background-color: rgb(253, 248, 246);
  padding: 1rem 1rem;
  color: black;
}

.panic-overlay .request-response pre.open {
  max-height: auto;
}

.panic-overlay .request-response pre.preview {
  max-height: 13.5rem;
  overflow-y: auto;

  -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 75%, rgba(0, 0, 0, 0));
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 75%, rgba(0, 0, 0, 0));
}

@media only screen and (max-width: 640px) {
  .panic-overlay {
    font-size: 15px;
  }

  .panic-overlay h1 {
    margin: 40px 0;
  }
}
@media only screen and (max-width: 500px) {
  .panic-overlay {
    font-size: 14px;
  }

  .panic-overlay h1 {
    margin: 30px 0;
  }
}
`

const Discourse = () => (
  <a
    href="https://community.redwoodjs.com"
    title="Go to Redwood's Discourse server"
  >
    <svg
      className="discourse"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
    >
      <path d="M16.1357143,0 C7.37857143,0 0,7.03571429 0,15.7214286 C0,16 0.00714285714,32 0.00714285714,32 L16.1357143,31.9857143 C24.9,31.9857143 32,24.6785714 32,15.9928571 C32,7.30714286 24.9,0 16.1357143,0 Z M16,25.1428571 C14.6142857,25.1428571 13.2928571,24.8357143 12.1142857,24.2785714 L6.32142857,25.7142857 L7.95714286,20.3571429 C7.25714286,19.0642857 6.85714286,17.5785714 6.85714286,16 C6.85714286,10.95 10.95,6.85714286 16,6.85714286 C21.05,6.85714286 25.1428571,10.95 25.1428571,16 C25.1428571,21.05 21.05,25.1428571 16,25.1428571 Z"></path>
    </svg>
  </a>
)

const Discord = () => (
  <a href="https://discord.gg/redwoodjs" title="Go to Redwood's Discord server">
    <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M29.9699 7.7544C27.1043 5.44752 22.5705 5.05656 22.3761 5.04288C22.2284 5.03072 22.0806 5.0648 21.9531 5.1404C21.8257 5.216 21.7249 5.32937 21.6647 5.4648C21.5783 5.65936 21.5049 5.85949 21.4451 6.06384C23.3409 6.38424 25.6694 7.02864 27.7761 8.33616C27.8565 8.38604 27.9262 8.45126 27.9814 8.52809C28.0366 8.60493 28.0761 8.69187 28.0976 8.78397C28.1192 8.87607 28.1224 8.97151 28.1071 9.06485C28.0917 9.15819 28.0582 9.24759 28.0083 9.32796C27.9584 9.40833 27.8932 9.47809 27.8164 9.53325C27.7395 9.58842 27.6526 9.62791 27.5605 9.64947C27.4684 9.67103 27.373 9.67424 27.2796 9.65892C27.1863 9.6436 27.0969 9.61004 27.0165 9.56016C23.3949 7.3116 18.8719 7.2 17.9999 7.2C17.1287 7.2 12.6028 7.31232 8.98338 9.55944C8.90301 9.60932 8.81361 9.64288 8.72027 9.6582C8.62693 9.67352 8.53149 9.67031 8.43939 9.64875C8.25339 9.6052 8.09231 9.48955 7.99158 9.32724C7.89085 9.16493 7.85873 8.96925 7.90227 8.78325C7.94582 8.59725 8.06147 8.43617 8.22378 8.33544C10.3305 7.03152 12.659 6.38424 14.5547 6.06672C14.4453 5.7096 14.3459 5.48424 14.3387 5.4648C14.2788 5.32841 14.1776 5.2143 14.0493 5.13859C13.921 5.06288 13.7721 5.0294 13.6238 5.04288C13.4294 5.05728 8.89554 5.44752 5.99034 7.78536C4.47474 9.18792 1.43994 17.3894 1.43994 24.48C1.43994 24.6067 1.47378 24.7277 1.5357 24.8371C3.62802 28.5163 9.3405 29.4775 10.6423 29.52H10.6646C10.7782 29.5203 10.8903 29.4937 10.9916 29.4424C11.093 29.3911 11.1808 29.3165 11.2478 29.2248L12.5632 27.4133C9.01146 26.4967 7.19706 24.9386 7.09338 24.8458C6.95017 24.7194 6.86303 24.5412 6.85115 24.3506C6.83927 24.1599 6.90361 23.9723 7.03002 23.8291C7.15643 23.6859 7.33456 23.5988 7.52522 23.5869C7.71588 23.575 7.90345 23.6394 8.04666 23.7658C8.08842 23.8054 11.4299 26.64 17.9999 26.64C24.5807 26.64 27.9223 23.7938 27.9561 23.7658C28.0998 23.6403 28.2874 23.5769 28.4777 23.5896C28.668 23.6023 28.8456 23.69 28.9713 23.8334C29.0335 23.9042 29.0812 23.9864 29.1117 24.0756C29.1421 24.1647 29.1546 24.259 29.1486 24.353C29.1426 24.447 29.1181 24.5389 29.0766 24.6235C29.035 24.708 28.9772 24.7836 28.9065 24.8458C28.8028 24.9386 26.9884 26.4967 23.4367 27.4133L24.7528 29.2248C24.8198 29.3164 24.9074 29.3909 25.0087 29.4422C25.1099 29.4935 25.2218 29.5202 25.3353 29.52H25.3569C26.6601 29.4775 32.3719 28.5156 34.4649 24.8371C34.5261 24.7277 34.5599 24.6067 34.5599 24.48C34.5599 17.3894 31.5251 9.18864 29.9699 7.7544V7.7544ZM13.3199 21.6C11.9275 21.6 10.7999 20.3112 10.7999 18.72C10.7999 17.1288 11.9275 15.84 13.3199 15.84C14.7124 15.84 15.8399 17.1288 15.8399 18.72C15.8399 20.3112 14.7124 21.6 13.3199 21.6ZM22.6799 21.6C21.2875 21.6 20.1599 20.3112 20.1599 18.72C20.1599 17.1288 21.2875 15.84 22.6799 15.84C24.0724 15.84 25.1999 17.1288 25.1999 18.72C25.1999 20.3112 24.0724 21.6 22.6799 21.6Z"></path>
    </svg>
  </a>
)
