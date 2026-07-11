export const ECOSYSTEM = `module.exports = {
  apps: [
    {
      name: 'serve',
      cwd: 'current',
      script: 'node_modules/.bin/rw',
      args: 'serve',
      instances: 'max',
      exec_mode: 'cluster',
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
}`

export const DEPLOY = `# This file contains config for a baremetal deployment
#
# SSH connection options include:
#
# * host - the remote server hostname/IP
# * port - defaults to 22
# * username - required, the user you're connecting as
# * password - only set if you're not using key-based authentication
# * privateKey - a Buffer containing the private key (use this _or_ \'privateKeyPath\', not both)
# * privateKeyPath - local file path to a private key that will be sent with the connection request
# * passphrase - used if your private key has a passphrase
# * agentForward - set to \`true\` to forward the client machine's ssh credentials
#
# See https://redwoodjs.com/docs/deploy/baremetal for more info

[[production.servers]]
host = "server.com"
username = "user"
agentForward = true
sides = ["api","web"]
packageManagerCommand = "yarn"
monitorCommand = "pm2"
path = "/var/www/app"
processNames = ["serve"]
repo = "git@github.com:myorg/myapp.git"
branch = "main"
keepReleases = 5
freeSpaceRequired = 2048

# If you have separate api and web servers:
#
# [[production.servers]]
# host = "api.server.com"
# username = "user"
# agentForward = true
# sides = ["api"]
# path = "/var/www/app"
# repo = "git@github.com:redwoodjs/redwood.git"
# branch = "main"
# processNames = ["api"]
#
# [[production.servers]]
# host = "web.server.com"
# username = "user"
# agentForward = true
# sides = ["web"]
# path = "/var/www/app"
# repo = "git@github.com:redwoodjs/redwood.git"
# branch = "main"
# migrate = false # only one server in a cluster needs to migrate
# processNames = ["web"]
`

export const MAINTENANCE = `<!--
Put up this maintenance page on your deployed service with:

  yarn rw baremetal deploy --maintenance up

And take it back down with:

  yarn rw baremetal deploy --maintenance down
-->

<!DOCTYPE html>
<html>
  <head>
    <title>Maintenance</title>
    <style>
      html, body {
        margin: 0;
      }
      html * {
        box-sizing: border-box;
      }
      main {
        display: flex;
        align-items: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
        text-align: center;
        background-color: #E2E8F0;
        height: 100vh;
      }
      section {
        background-color: white;
        border-radius: 0.25rem;
        width: 36rem;
        padding: 1rem;
        margin: 0 auto;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
      }
      h1 {
        font-size: 2rem;
        margin: 0;
        font-weight: 500;
        line-height: 1;
        color: #2D3748;
      }
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1>
          <span>Maintenance Mode: Be Back Soon</span>
        </h1>
      </section>
    </main>
  </body>
</html>
`
