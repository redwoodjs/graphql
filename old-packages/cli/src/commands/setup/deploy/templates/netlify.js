import { getConfig } from '../../../../lib'

const config = getConfig()

export const NETLIFY_TOML = `\
[build]
  command = "yarn rw deploy netlify"
  publish = "web/dist"
  functions = "api/dist/functions"

  [build.environment]
    NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/200.html"
  status = 200

# To use Netlify Dev, install Netlify's CLI (\`netlify-cli\`) from NPM and use \`netlify link\`
# to connect your local project to a site on Netlify. Then run \`netlify dev\`.
#
# Quick links to the docs:
# - Netlfy Dev https://www.netlify.com/products/dev
# - Netlify's CLI https://docs.netlify.com/cli/get-started/#installation
# - \`netlify link\` https://docs.netlify.com/cli/get-started/#link-and-unlink-sites
[dev]
  framework = "redwoodjs"
  # Make sure \`targetPort\` matches \`web.port\` in the \`redwood.toml\`:
  targetPort = ${config.web.port}
  # Point your browser to this port to access your app:
  port = 8888
`
