# Intermission

Let's take a break! If you really went through the whole tutorial so far: congratulations! If you just skipped ahead to this page to try and get a free congratulations: tsk, tsk!

That was potentially a lot of new concepts to absorb all at once so don't feel bad if all of it didn't fully sink in. React, GraphQL, Prisma, serverless functions...so many things! Even those of us working on the framework are heading over to Google multiple times per day to figure out how to get these things to work together.

As an anonymous Twitter user once mused: "If you enjoy switching between feeling like the smartest person on earth and the dumbest person in history all in the same day, programming may be the career for you!"

## What's Next?

Starting in Chapter 5 We'll look at Storybook and Jest and build a new feature for the blog: comments. Storybook introduces a new way to build components. We'll also add tests and run them with Jest to make sure things keep working as we expect. We cover authorization as well by giving a special role to comment moderators.

If you've been through the tutorial so far, you can pick up where you left off and continue from here with Chapter 5. However, going forward we assume a complete test suite and several Storybook components, which we didn't get a chance to build in the first half. To get to the same starting point as the beginning of Chapter 5 you can start from this [example repo](https://github.com/redwoodjs/redwood-tutorial) (which we highly recommend) that picks up at the end of chapter 4, but already has additional styling, a starting test suite, and several Storybook components already built for you.

### Using Your Current Codebase

If you want to use the same CSS classes we use in the following examples you'll need to add Tailwind to your repo:

```bash
yarn rw setup ui tailwindcss
```

However, none of the screenshots that follow will come anywhere close to what you're seeing in your browser (except for those isolated components you build in Storybook) so you may want to just start with the [example repo](https://github.com/redwoodjs/redwood-tutorial). You'll also be missing out on a good starting test suite that we've added!

If you're _still_ set on continuing with your own repo, and you deployed to a service like Netlify, you would have changed the database provider in `schema.prisma` to `postgresql`. If that's the case then make sure your local development environment has changed over as well. Check out the [Local Postgres Setup](../local-postgres-setup.md) for assistance. If you stick with the [example repo](https://github.com/redwoodjs/redwood-tutorial) instead, you can go ahead with good ol' SQLite (what we were using locally to build everything in the first half).

Once you're ready, start up the dev server:

```bash
yarn rw dev
```

### Using the Example Repo (Recommended)

If you haven't been through the first tutorial, or maybe you went through it on an older version of Redwood (anything pre-0.41) you can clone [this repo](https://github.com/redwoodjs/redwood-tutorial) which contains everything built so far and also adds a little styling so it isn't quite so...tough to look at. The example repo includes [TailwindCSS](https://tailwindcss.com) to style things up and adds a `<div>` or two to give us some additional hooks to hang styling on.

:::warning The TypeScript version of the Example Repo is currently in progress

If you want to complete the tutorial in TypeScript, continue with your own repo, making any necessary edits. Don't worry, the remainder of the tutorial continues to offer both TypeScript and JavaScript example code changes.

:::

```bash
git clone https://github.com/redwoodjs/redwood-tutorial
cd redwood-tutorial
yarn install
yarn rw prisma migrate dev
yarn rw g secret
```

That'll check out the repo, install all the dependencies, create your local database (SQLite) and fill it with a few blog posts. After that last command (`yarn rw g secret`) you'll need to copy the string that's output and add it to a file `.env` in the root of your project:

```bash title=".env"
SESSION_SECRET=JV2kA48ZU4FnLHwqaydy9beJ99qy4VgWXPkvsaw3xE2LGyuSur2dVq2PsPkPfygr
```

This is the encryption key for the secure cookies used in [dbAuth](/docs/tutorial/chapter4/authentication#session-secret).

Now just run `yarn rw dev` to start your development server. Your browser should open to a fresh new blog app:

![image](https://user-images.githubusercontent.com/300/101423176-54e93780-38ad-11eb-9230-ba8557764eb4.png)

Take a bathroom break and grab a fresh beverage, then let's get on with it!
