import path from 'path'

import { getPaths } from '../../../../lib'

export const PROJECT_NAME = path.basename(getPaths().base)

export const RENDER_YAML = (database) => {
  return `# Quick links to the docs:
# - Redwood on Render: https://render.com/docs/deploy-redwood
# - Render's Blueprint spec: https://render.com/docs/yaml-spec

services:
- name: ${PROJECT_NAME}-web
  type: web
  env: static
  buildCommand: corepack enable && yarn install && yarn rw deploy render web
  staticPublishPath: ./web/dist

  envVars:
  - key: SKIP_INSTALL_DEPS
    value: true

  routes:
  - type: rewrite
    source: /.redwood/functions/*
    # Replace \`destination\` here after your first deploy:
    #
    # \`\`\`
    # destination: https://my-redwood-project-api.onrender.com/*
    # \`\`\`
    destination: replace_with_api_url/*
  - type: rewrite
    source: /*
    destination: /200.html

- name: ${PROJECT_NAME}-api
  type: web
  plan: free
  env: node
  region: oregon
  buildCommand: corepack enable && yarn install && yarn rw build api
  startCommand: yarn rw deploy render api

  envVars:
${database}
`
}

export const POSTGRES_YAML = `\
  - key: DATABASE_URL
    fromDatabase:
      name: ${PROJECT_NAME}-db
      property: connectionString

databases:
  - name: ${PROJECT_NAME}-db
    region: oregon`

export const SQLITE_YAML = `\
  - key: DATABASE_URL
    value: file:./data/sqlite.db
  disk:
    name: sqlite-data
    mountPath: /opt/render/project/src/api/db/data
    sizeGB: 1`

export const RENDER_HEALTH_CHECK = `\
// render-health-check
export const handler = async () => {
  return {
    statusCode: 200,
  }
}
`
