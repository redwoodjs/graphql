# Using GitPod

## What is GitPod?

GitPod is a cloud development environment with all the necessary tools and dependencies, allowing you to focus on building your RedwoodJS application without worrying about the setup. Get started quickly and efficiently by launching RedwoodJS inside GitPod!

## Getting Started

Click on the Open in GitPod button:

[![Open in GitPod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/redwoodjs/starter)

<iframe width="100%" height="315" src="https://www.youtube.com/embed/guz67aa_1Wk?si=p1uc2EK6o8HJGBax" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

This will launch GitPod and ask you to configure a new workspace. Click continue.

![GitPod Onboarding Screen](https://github.com/redwoodjs/starter/raw/main/images/gitpod-new-workspace.png)

GitPod will then begin to build your workspace. This may take several minutes.

What's going on behind the scenes:

- GitPod is setting up the workspace
- It installs our recommended VS Code plugins:
  - [ESLint](https://github.com/redwoodjs/starter/blob/main)
  - [Git Lens](https://github.com/redwoodjs/starter/blob/main)
  - [VS Code Language - Babel](https://github.com/redwoodjs/starter/blob/main)
  - [VS Code Version Lens](https://github.com/redwoodjs/starter#:~:text=VS%20Code%20Version%20Lens)
  - [Editor Config](https://github.com/redwoodjs/starter#:~:text=Code%20Version%20Lens-,Editor%20Config,-Prisma)
  - [Prisma](https://github.com/redwoodjs/starter/blob/main)
  - [VS Code GraphQL](https://github.com/redwoodjs/starter/blob/main)
- It runs our **Create Redwood App** which will install the latest stable version of Redwood. We're setting this project to use TypeScript, however, you can [change it to JavaScript](https://github.com/redwoodjs/starter/blob/main) if you prefer.
- It runs `yarn install`, adding all the dependencies for the project
- Changes the database over to Postgres

Once everything is up and running, you can click on the Ports tab:

![GitPod Ports Tab](https://github.com/redwoodjs/starter/raw/main/images/gitpod-ports.png)

You can click on the address or the globe icon to open that particular port in a new tab.

- Port 5432 is the database. So, if you click on that port, you'll probably see a "Port 5432 Not Found" error, but it is working!
  ![GitPod on Port 5432](https://github.com/redwoodjs/starter/raw/main/images/gitpod-port-5432.png)

- Port 8910 is your frontend
  ![Port 8910 frontend](https://github.com/redwoodjs/starter/raw/main/images/gitpod-port-8910.png)

- Port 8911 is your backend and will show you a list of all available functions. If you add `/graphql` to the end of the URL, you should see the GraphQL Playground
  ![Port 8911 GraphQL Playground](https://github.com/redwoodjs/starter/raw/main/images/gitpod-graphql.png)

## How to Use GitPod

<iframe width="560" height="315" src="https://www.youtube.com/embed/5pNHaqJWKL4?si=OmkQvmPL_Cc3djLg" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

If you have an existing project, you can still use GitPod:

1. Take any repository within GitHub and append `gitpod.io/#` to the URL. This will quickly launch a GitPod workspace.
2. Within the Terminal, run `yarn install` to install all the dependencies
