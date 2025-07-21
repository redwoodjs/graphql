---
description: Serverful deploys via Render's unified cloud
---

# Deploy to Render

Render is a unified cloud to build and run all your apps and websites with free SSL, a global CDN, private networks and auto-deploys from Git — **database included**!

## Render tl;dr Deploy

If you simply want to experience the Render deployment process, including a Postgres or SQLite database, you can do the following:

1. create a new redwood project: `yarn create redwood-app ./render-deploy`
2. after your "render-deploy" project installation is complete, init git, commit, and add it as a new repo to GitHub or GitLab
3. run the command `yarn rw setup deploy render`, use the flag `--database` to select from `postgresql`, `sqlite` or `none` to proceed without a database [default : `postgresql`]
4. follow the [Render Redwood Deploy Docs](https://render.com/docs/deploy-redwood) for detailed instructions
