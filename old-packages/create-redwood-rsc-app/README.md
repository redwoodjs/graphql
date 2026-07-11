# Create Redwood RSC App

This is the RedwoodJS RSC quick-start installer. It's designed to get you
started as fast as possible with a new RedwoodJS project with RSC support
enabled.

It's _very_ opinionated. If you need more control over your project setup,
please use our standard RedwoodJS installer.

## Usage

```shell
npx -y create-redwood-rsc-app <desired-installation-directory>
```

## Publishing

First make sure you have an NPM token with publish rights configured in your
`~/.yarnrc.yml` file.

Then just run the following command when you're on the `main` branch:
`yarn tsx publish.ts <version> <otp>` where `<version>` is
"patch", "minor", or "major" and `<otp>` is your two-factor authentication
token.

It will updata the version in `package.json`, create a new commit and tag it.
After that it'll publish a new version to NPM and finally it'll push the new
commit and tag to the upstream `main` branch.
