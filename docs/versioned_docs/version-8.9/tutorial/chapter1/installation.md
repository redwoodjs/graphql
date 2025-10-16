# Installation & Starting Development

We'll use yarn ([yarn](https://yarnpkg.com/getting-started/install) is a requirement) to create the basic structure of our app:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```bash
yarn create redwood-app ./redwoodblog
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```bash
yarn create redwood-app --ts ./redwoodblog
```

</TabItem>
</Tabs>

You'll have a new directory `redwoodblog` containing several directories and files. Change to that directory and we'll start the development server:

```bash
cd redwoodblog
yarn install
yarn redwood dev
```

A browser should automatically open to [http://localhost:8910](http://localhost:8910) and you will see the Redwood welcome page:

![Redwood Welcome Page](https://user-images.githubusercontent.com/300/145314717-431cdb7a-1c45-4aca-9bbc-74df4f05cc3b.png)

:::tip

Remembering the port number is as easy as counting: 8-9-10!

:::

The splash page gives you links to many resources, but don't get distracted: we've got a job to do!

### First Commit

Now that we have the skeleton of our Redwood app in place, it's a good idea to save the current state of the app as your first commit...just in case.

```bash
git init
git add .
git commit -m 'First commit'
```

[git](https://git-scm.com/) is another of those concepts we assume you know, but you _can_ complete the tutorial without it. Well, almost: you won't be able to deploy! At the end we'll be deploying to a provider that requires your codebase to be hosted in either [GitHub](https://github.com) or [GitLab](https://gitlab.com).

If you're not worried about deployment for now, you can go ahead and complete the tutorial without using `git` at all.
