# Prerequisites

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/HJOzmp8oCIQ?rel=0" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; modestbranding; showinfo=0; fullscreen"></iframe>
</div>

Redwood is composed of several popular libraries to make full-stack web development easier. Unfortunately, we can't teach all of those technologies from scratch during this tutorial, so we're going to assume you are already familiar with a few core concepts:

- [React](https://react.dev/)
- [GraphQL](https://graphql.org/)
- [Prisma](https://prisma.io/)
- [Jamstack Deployment](https://jamstack.org/)

**Don't panic!** You can work through this tutorial without knowing much of anything about these technologies. You may find yourself getting lost in terminology that we don't stop and take the time to explain, but that's okay: just know that the nitty-gritty details of how those technologies work is out there and there will be plenty of time to learn them. As you learn more about them you'll start to see the lines between what Redwood provides on top of the stock implementations of these projects.

You could definitely learn them all at once, but it will be harder to determine where one ends and another begins, which makes it more difficult to find help once you're past the tutorial and want to dive deeper into one technology or another. Our advice? Make it through the tutorial and then start building something on your own! When you find that what you learned in the tutorial doesn't exactly apply to a feature you're trying to build, Google for where you're stuck ("prisma select only some fields") and you'll be an expert in no time. And don't forget our [Discourse](https://community.redwoodjs.com/) and [Discord](https://discord.com/invite/redwoodjs) where you can get help from the creators of the framework, as well as tons of helpful community members.

### Redwood Versions

You will want to be on at least version 7.0.0 to complete the tutorial. If this is your first time using Redwood then no worries: the latest version will be installed automatically when you create your app skeleton!

If you have an existing site created with a prior version, you'll need to upgrade and (most likely) apply code modifications. Follow this two step process:

1. For _each_ version included in your upgrade, follow the "Code Modifications" section or "Upgrade Guide" of the specific version's Release Notes:
   - [Redwood Releases](https://github.com/redwoodjs/redwood/releases)
2. Then upgrade to the latest version. Run the command:
   - `yarn redwood upgrade`

### Node.js and Yarn Versions

During installation, RedwoodJS checks if your system meets version requirements for Node and Yarn:

- node: "=20.x"
- yarn: ">=1.22.21"

If you're using a version of Node or Yarn that's **less** than what's required, _the installation bootstrap will result in an ERROR_. To check, please run the following from your terminal command line:

```bash
node --version
yarn --version
```

Please do upgrade accordingly. Then proceed to the Redwood installation when you're ready!

:::info Installing Node and Yarn

There are many ways to install and manage both Node.js and Yarn. If you're installing for the first time, we recommend the following:

**1. Node.js**
Using the recommended [LTS version from Nodejs.org](https://nodejs.org/en/) is preferred.

- `nvm` is a great tool for managing multiple versions of Node on one system. It takes a bit more effort to set up and learn, however. Follow the [nvm installation instructions](https://github.com/nvm-sh/nvm#installing-and-updating). (Windows users should go to [nvm-windows](https://github.com/coreybutler/nvm-windows/releases)). For **Mac** users with Homebrew installed, you can alternatively use it to [install `nvm`](https://formulae.brew.sh/formula/nvm). Or, refer to our how to guide [using nvm](../../how-to/using-nvm.md).

**2. Yarn**
As of Node.js v18+, Node.js ships with a CLI tool called [Corepack](https://nodejs.org/docs/latest-v18.x/api/corepack.html) to manage package managers. All you have to do is enable it, then you'll have Yarn:

```
corepack enable
yarn -v
```

The version of Yarn will probably be `1.22.21`, but don't worry—in your Redwood project, Corepack will know to use a modern version of Yarn because of the `packageManager` field in the root `package.json`.

**Windows:** Recommended Development Setup

- JavaScript development on Windows has specific requirements in addition to Yarn and npm. Follow our simple setup guide:

  [Recommended Windows Development Setup](../../how-to/windows-development-setup.md)

:::
