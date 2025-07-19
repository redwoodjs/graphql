---
description: Automate the deployment of Redwood app with CloudRay  
---

# Deploy with CloudRay

You can deploy your Redwood app using [CloudRay](https://cloudray.io), a centralised platform that helps you manage your servers, organize Bash scripts, and automate deployment tasks across virtual machines and cloud servers.

:::note
CloudRay itself does not host your site. Instead, it provides automation tools to run deployment scripts on your own infrastructure (e.g., Ubuntu servers) using a connected agent.
:::

## Prerequisites

To get started, you’ll need:

- A [CloudRay account](https://app.cloudray.io/)
- Your RedwoodJS project stored in a GitHub repository

## How to Deploy through the CloudRay Dashboard

Deployment with CloudRay generally involves three main steps:

1. Install the [CloudRay Agent](https://cloudray.io/docs/agent) on your server to securely register your machine and enable remote automation.
2. In the CloudRay dashboard, write a reusable Bash script that clones your RedwoodJS repo, installs dependencies, builds the project, and configures a web server (e.g, Nginx or Caddy). You can define repo-specific values using [CloudRay’s variable groups](https://cloudray.io/docs/variable-groups).
3. Use CloudRay’s Runlog interface to execute your script on the connected server and monitor the deployment process in real time.

## CloudRay Complete Deploy Walkthrough

For the complete deployment process with CloudRay, checkout the [RedwoodJS guide in CloudRay’s docs](https://cloudray.io/articles/how-to-deploy-redwoodjs-application-on-ubuntu).
