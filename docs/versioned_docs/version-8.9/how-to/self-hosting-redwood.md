# Self-hosting Redwood (Serverful)

:::warning

This doc has been deprecated in favor of the [Baremetal](../deploy/baremetal.md) docs.

:::

Do you prefer hosting Redwood on your own server, the traditional serverful way, instead of all this serverless magic? Well, you can! In this recipe we configure a Redwood app with PM2 and Nginx on a Linux server.

> A code example can be found at https://github.com/njjkgeerts/redwood-pm2, and can be viewed live at http://redwood-pm2.nickgeerts.com.

## Requirements

You should have some basic knowledge of the following tools:

- [PM2](https://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/)
- [Nginx](https://nginx.org/en/docs/)
- Linux
- [Postgres](https://www.postgresql.org/docs/)

## Configuration

To self-host, you'll have to do a bit of configuration both to your Redwood app and your Linux server.

### Adding Dependencies

First add PM2 as a dev dependency to your project root:

```termninal
yarn add -D pm2
```

Then create a PM2 ecosystem configuration file. For clarity, it's recommended to rename `ecosystem.config.js` to something like `pm2.config.js`:

```bash
yarn pm2 init
mv ecosystem.config.js pm2.config.js
```

Last but not least, change the API endpoint in `redwood.toml`:

```diff
- apiUrl = "/.redwood/functions"
+ apiUrl = "/api"
```

Optionally, add some scripts to your top-level `package.json`:

```json
"scripts": {
  "deploy:setup": "pm2 deploy pm2.config.js production setup",
  "deploy": "pm2 deploy pm2.config.js production deploy"
}
```

We'll refer to these later, so even if you don't add them to your project, keep them in mind.

### Linux server

Your Linux server should have a user for deployment, configured with an SSH key providing access to your production environment. In this example, the user is named `deploy`.

### Nginx

Typically, you keep your Nginx configuration file at `/etc/nginx/sites-available/redwood-pm2` and symlink it to `/etc/nginx/sites-enabled/redwood-pm2`. It should look something like this:

```nginx {10}
server {
  server_name redwood-pm2.example.com;
  listen 80;

  location / {
    root /home/deploy/redwood-pm2/current/web/dist;
    try_files $uri /index.html;
  }

  location /api/ {
    proxy_pass http://localhost:8911/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

Please note that the trailing slash in `proxy_pass` is essential to correctly map the API functions.

### PM2

Let's configure PM2 with the `pm2.config.js` file we made earlier. The most important variables are at the top. Note that the port is only used locally on the server and should match the port in the Nginx config:

```javascript
const name = 'redwood-pm2' // Name to use in PM2
const repo = 'git@github.com:njjkgeerts/redwood-pm2.git' // Link to your repo
const user = 'deploy' // Server user
const path = `/home/${user}/${name}` // Path on the server to deploy to
const host = 'example.com' // Server hostname
const port = 8911 // Port to use locally on the server
const build = `yarn install && yarn rw build && yarn rw prisma migrate deploy`

module.exports = {
  apps: [
    {
      name,
      node_args: '-r dotenv/config',
      cwd: `${path}/current/`,
      script: 'yarn rw serve api',
      args: `--port ${port}`,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],

  deploy: {
    production: {
      user,
      host,
      ref: 'origin/master',
      repo,
      path,
      ssh_options: 'ForwardAgent=yes',
      'post-deploy': `${build} && pm2 reload pm2.config.js --env production && pm2 save`,
    },
  },
}
```

If you need to seed your production database during your first deployment, `yarn redwood prisma migrate dev` will do that for you.

> **Caveat:** the API seems to only work in fork mode in PM2, not [cluster mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/).

## Deploying

First, we need to create the PM2 directories:

```bash
yarn install
yarn deploy:setup
```

Your server directories are now set, but we haven't configured the `.env` settings yet. SSH into your server and create an `.env` file in the `current` subdirectory of the deploy directory:

```bash
vim /home/deploy/redwood-pm2/current/.env
```

For example, add a `DATABASE_URL` variable:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/redwood-pm2
```

Now we can deploy the app! Just run the following; it should update the code, take care of database migrations, and restart the app in PM2:

```bash
yarn deploy
```

Enjoy! 😁
