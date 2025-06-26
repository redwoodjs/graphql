/* eslint-env node */

import http from 'http'
import path from 'path'

import { exec } from '@actions/exec'

console.log(
  `Telemetry is being redirected to ${process.env.REDWOOD_REDIRECT_TELEMETRY}`,
)

// Setup fake telemetry server
const server = http.createServer((req, res) => {
  let data = ''
  req.on('data', (chunk) => {
    data += chunk
  })
  req.on('end', () => {
    res.writeHead(200)
    res.end()
    console.log('Telemetry packet received')
    process.exit(0)
  })
})

// Run the fake telemetry server at the redirected location
const host = process.env.REDWOOD_REDIRECT_TELEMETRY.split(':')[1].slice(2)
const port = parseInt(process.env.REDWOOD_REDIRECT_TELEMETRY.split(':')[2])
server.listen(port, host, () => {
  console.log(`Telemetry listener is running on http://${host}:${port}`)
})

// Run a command and await output
try {
  const mode = process.argv[process.argv.indexOf('--mode') + 1]
  let exitCode = 0
  switch (mode) {
    case 'crwa':
      exitCode = await exec(
        `yarn node ./packages/create-redwood-app/dist/create-redwood-app.js ../project-for-telemetry --typescript true --git false --no-yarn-install`,
      )
      if (exitCode) {
        process.exit(1)
      }
      break
    case 'cli':
      exitCode = await exec(`yarn install`, null, {
        cwd: path.join(process.cwd(), '../project-for-telemetry'),
      })
      if (exitCode) {
        process.exit(1)
      }
      exitCode = await exec(
        `yarn --cwd ../project-for-telemetry node ../graphql/packages/cli/dist/index.js info`,
      )
      if (exitCode) {
        process.exit(1)
      }
      break
    default:
      console.error(`Unknown mode: ${mode}`)
      process.exit(1)
  }
} catch (error) {
  console.error(error)
}

// If we didn't hear the telemetry after 2 mins then let's fail
await new Promise((r) => setTimeout(r, 120_000))
console.error('No telemetry response within 120 seconds. Failing...')
process.exit(1)
