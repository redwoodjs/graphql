# Introduction to Testing

Let's run the test suite to make sure everything is working as expected (you can keep the dev server running and start this in a new terminal window):

```bash
yarn rw test
```

The `test` command starts a persistent process which watches for file changes and automatically runs any tests associated with the changed file(s) (changing a component _or_ its tests will trigger a test run).

Since we just started the suite, and we haven't changed any files yet, it may not actually run any tests at all. Hit `a` to tell it run **a**ll tests and we should get something like this:

![tests_running](https://user-images.githubusercontent.com/46945607/165376937-89ed9254-0d8e-4945-a0d9-17178764a4b0.png)

If you cloned the example repo during the intermission and followed along with the Storybook tutorial in this chapter, the test run should finish and you will see something like this:

![suite_finished](https://user-images.githubusercontent.com/46945607/165378519-2859dd0d-d46a-448f-a62e-0b8f91c55a87.png)

:::info

If you decided to keep your codebase from the first part of the tutorial, then you'll get the following error after running

```bash
yarn rw test

Error: Get config: Schema Parsing P1012

error: Error validating datasource `db`: the URL must start with the protocol `postgresql://` or `postgres://`.
  -->  schema.prisma:3
   |
 2 |   provider = "postgresql"
 3 |   url      = env("DATABASE_URL")
   |

Validation Error Count: 1

error Command failed with exit code 1.
```

To clear the error and to proceed with running the test suite, head over to your `.env` file and add the following line:

```bash
TEST_DATABASE_URL=<the same url as DATABASE_URL>
```

:::

Note that the summary on the bottom indicates that there was 1 test that failed. If you feel curious, you can scroll up in your terminal and see more details on the test that failed. We'll also take a look at that failed test shortly.

If you continued with your own repo from chapters 1-4, you may see some other failures here or none at all: we made a lot of changes to the pages, components and cells we generated, but didn't update the tests to reflect the changes we made. (Another reason to start with the [example repo](../intermission.md#using-the-example-repo-recommended)!)

To switch back to the default mode where test are **only** run for changed files, press `o` now (or quit and restart `yarn rw test`).

What we want to aim for is all green in that left column and no failed tests. In fact best practices tell us you should not even commit any code to your repo unless the test suite passes locally. Not everyone adheres to this policy quite as strictly as others..._&lt;cough, cough&gt;_

We've got an excellent document on [Testing](../../testing.md) which you should definitely read if you're brand new to testing, especially the [Terminology](../../testing.md#terminology) and [Redwood and Testing](../../testing.md#redwood-and-testing) sections. For now though, proceed to the next section and we'll go over our approach to getting that last failed test passing.
