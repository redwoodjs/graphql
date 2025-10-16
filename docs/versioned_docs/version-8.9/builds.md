---
description: What happens when you build your app
---

# Builds

> ⚠ **Work in Progress** ⚠️
>
> There's more to document here. In the meantime, you can check our [community forum](https://community.redwoodjs.com/search?q=yarn%20rw%20build) for answers.
>
> Want to contribute? Redwood welcomes contributions and loves helping people become contributors.
> You can edit this doc [here](https://github.com/redwoodjs/redwoodjs.com/blob/main/docs/builds.md).
> If you have any questions, just ask for help! We're active on the [forums](https://community.redwoodjs.com/c/contributing/9) and on [discord](https://discord.com/channels/679514959968993311/747258086569541703).

## API

The api side of Redwood is transpiled by Babel into the `./api/dist` folder.

### Steps on Netlify

To emulate Netlify's build steps locally:

```bash
yarn rw build api
cd api
yarn zip-it-and-ship-it dist/functions/ zipballs/
```

Each lambda function in `./api/dist/functions` is parsed by zip-it-and-ship-it resulting in a zip file per lambda function that contains all the dependencies required for that lambda function.

> Note: The `@netlify/zip-it-and-ship-it` package needs to be installed as a dev dependency in `api/`. Use the command `yarn workspace api add -D @netlify/zip-it-and-ship-it`.
>
> - You can learn more about the package [here](https://www.npmjs.com/package/@netlify/zip-it-and-ship-it).
> - For more information on AWS Serverless Deploy see these [docs](/docs/deploy/serverless).

## Web

The web side of Redwood is built by Vite into the `./web/dist` folder.
