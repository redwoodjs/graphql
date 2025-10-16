---
slug: creating-a-background-worker-with-exec-and-faktory
---

# Creating a Background Worker with Exec and Faktory

In this how to, we'll use Redwood's [exec CLI command](cli-commands.md#exec) to create a background worker using [Faktory](https://contribsys.com/faktory/).

At a high level, Faktory is a language-agnostic, persistent background-job server.
You can run it [with Docker](https://github.com/contribsys/faktory/wiki/Docker).

We'll have to have a way of communicating with the server from our Redwood app.
We'll use this [node library](https://github.com/jbielick/faktory_worker_node) to send jobs from our Redwood app to our Faktory server.

## Creating the Faktory Worker

Let's create our faktory worker.
First, generate the worker script:

```
yarn rw g script faktoryWorker
```

We'll start by registering a task called `postSignupTask` in our worker:

```javascript title="scripts/faktoryWorker.js"
const { postSignupTask } from '$api/src/lib/tasks'
import { logger } from '$api/src/lib/logger'

import faktory from 'faktory-worker'

faktory.register('postSignupTask', async (taskArgs) => {
  logger.info("running postSignupTask in background worker")

  await postSignupTask(taskArgs)
})

export default async ({ _args }) => {
  const worker = await faktory
    .work({
      url: process.env.FAKTORY_URL,
    })
    .catch((error) => {
      logger.error(`worker failed to start: ${error}`)
      process.exit(1)
    })

  worker.on('fail', ({ _job, error }) => {
    logger.error(`worker failed to start: ${error}`)
  })
}
```

This won't work yet as we haven't made `postSignupTask` in `api/src/lib/tasks.js` or set `FAKTORY_URL`.
Set `FAKTORY_URL` in `.env` to where your server's running.

In `postSignupTask`, we may want to perform operations that need to contact external services, such as sending an email.
For this type of work, we typically don't want to hold up the request/response cycle and can perform it in the background:

```javascript title="api/src/lib/tasks.js"
export const postSignupTask = async ({ userId, emailPayload }) => {
  // Send a welcome email to new user.
  // You'll have to have an integration with an email service for this to work.
  await sendEmailWithTemplate({
    ...emailPayload,
    TemplateModel: {
      ...emailPayload.TemplateModel,
    },
  })
}
```

Once we've created our task, we need to call it in the right place.
For this task, it makes sense to call it right after the user has completed their signup.
This is an example of a Service that'll most likely be called via a GraphQL Mutation.

```javascript title="src/services/auth/auth.js"
const faktory = require('faktory-worker')

export const signUp = async ({ input }) => {
  // Perform all the signup operations, such as creating an entry in the DB and auth provider
  // ...

  // The, send our task to the Faktory server
  const client = await faktory.connect()
  await client.job('postSignupTask', { ...taskArgs }).push()
  await client.close()
}
```

That's it—we're done!
Run your Faktory server using Docker and run the worker using `yarn rw exec faktoryWorker`.

If your Faktory server is running and you have set `FAKTORY_URL` correctly, you'll see the server pick up the jobs and your worker process the job.
