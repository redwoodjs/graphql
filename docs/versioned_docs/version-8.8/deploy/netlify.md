---
description: The serverless git deploy you know and love
---

# Deploy to Netlify

## Netlify tl;dr Deploy

If you simply want to experience the Netlify deployment process without a database and/or adding custom code, you can do the following:

1. create a new redwood project: `yarn create redwood-app ./netlify-deploy`
2. after your "netlify-deploy" project installation is complete, init git, commit, and add it as a new repo to GitHub, BitBucket, or GitLab
3. run the command `yarn rw setup deploy netlify` and commit and push changes
4. use the Netlify [Quick Start](https://app.netlify.com/signup) to deploy

:::warning
While you may be tempted to use the [Netlify CLI](https://cli.netlify.com) commands to [build](https://cli.netlify.com/commands/build) and [deploy](https://cli.netlify.com/commands/deploy) your project directly from you local project directory, doing so **will lead to errors when deploying and/or when running functions**. I.e. errors in the function needed for the GraphQL server, but also other serverless functions.

The main reason for this is that these Netlify CLI commands simply build and deploy -- they build your project locally and then push the dist folder. That means that when building a RedwoodJS project, the [Prisma client is generated with binaries matching the operating system at build time](https://cli.netlify.com/commands/link) -- and not the [OS compatible](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#binarytargets-options) with running functions on Netlify. Your Prisma client engine may be `darwin` for OSX or `windows` for Windows, but it needs to be `debian-openssl-1.1.x` or `rhel-openssl-1.1.x`. If the client is incompatible, your functions will fail.

Therefore, **please follow the [Tutorial Deployment section](tutorial/chapter4/deployment.md)** to sync your GitHub (or other compatible source control service) repository with Netlify andalllow their build and deploy system to manage deployments.
:::

## Netlify Complete Deploy Walkthrough

For the complete deployment process on Netlify, see the [Tutorial Deployment section](tutorial/chapter4/deployment.md).
