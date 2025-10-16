# Deployment

The whole reason we started building Redwood was to make full-stack web apps easier to build and deploy on the Jamstack. While technically we already deployed in the previous section, it doesn't actually work yet. Let's fix that.

### Git

Remember at the start of the tutorial when we said that you didn't _really_ need to use git if you didn't want to? Well, if you want to follow along with this deploy, you'll need to start using it now. Sorry! Commit your changes and push up to GitHub, GitLab or Bitbucket if you want to continue to follow along. Need a git primer? The most concise one we've seen is to simply create a new repo on GitHub. You'll be shown the list of commands necessary to get your local code committed and pushed up:

![image](https://user-images.githubusercontent.com/300/152596271-7921c9dc-fe83-4827-b7e4-2740e826fb42.png)

But instead of just `git add README.md` use `git add .` since you've got an entire codebase ready to go.

### The Database

We'll need a database somewhere on the internet to store our data. We've been using SQLite locally, but the kind of deployment we're going to do doesn't have a persistent disk store that we can put SQLite's file-based database on. So, for this part of this tutorial, we will use Postgres. (Prisma currently supports SQLite, Postgres, MySQL and SQL Server.) Don't worry if you aren't familiar with Postgres, Prisma will do all the heavy lifting. We just need to get a database available to the outside world so it can be accessed by our app.

:::danger

Prisma only supports one database provider at a time, and since we can't use SQLite in production and _must_ switch to Postgres or MySQL, that means we need to use the same database on our local development system after making this change. See our [Local Postgres Setup](../../local-postgres-setup.md) guide to get you started.

:::

There are several hosting providers where you can quickly start up a Postgres instance:

- [Railway](https://railway.app/)
- [Heroku](https://www.heroku.com/postgres)
- [Digital Ocean](https://www.digitalocean.com/products/managed-databases)
- [AWS](https://aws.amazon.com/rds/postgresql/)

We're going to go with Railway for now because it's a) free and b) ridiculously easy to get started, by far the easiest we've found. You don't even need to create a login! The only limitation is that if you _don't_ create an account, your database will be removed after one day. If you think you can finish everything you need to do in the next 24 hours, go for it! Otherwise just create an account first and it'll stick around.

Head over to Railway and click **Start a New Project**:

![image](https://user-images.githubusercontent.com/300/152593861-3063732c-b459-4ee9-86ee-e00b28c003fb.png)

And then Provision PostgreSQL:

![image](https://user-images.githubusercontent.com/300/152593907-1f8b599e-b4fb-4930-a841-866505e3b79d.png)

And believe it or not, we're done! Now we just need the connection URL. Click on the **Postgres** card toward the left, and then the **Variables** tab. Copy the **DATABASE_URL**, which starts with `postgresql://`:

![Screenshot_2024-03-19_225953_dkf](https://github.com/redwoodjs/redwood/assets/158021342/69cc2cb1-e973-4234-abe1-ca591ba214bb)

### Change Database Provider

We need to let Prisma know that we intend to use Postgres instead of SQLite from now on. Update the `provider` entry in `schema.prisma`:

```javascript
provider = 'postgresql'
```

### Recreate Migrations

We will need to re-create our database migrations in a Postgres-compatible format. First, we need to tell Prisma where our new database lives so that it can access it from our dev environment. Open up `.env` and uncomment the `DATABASE_URL` var and update it to be the URL you copied from Railway, and save.

:::info

Note that `.env` is not checked into git by default, and should not be checked in under any circumstances! This file will be used to contain any secrets that your codebase needs (like database URLs and API keys) that should never been seen publicly. If you were to check this file in your repo, and your repo was public, anyone on the internet can see your secret stuff!

The `.env.defaults` file is meant for other environment variables (like non-sensitive config options for libraries, log levels, etc.) that are safe to be seen by the public and is meant to be checked into your repo and shared with other devs.

:::

Next, delete the `api/db/migrations` folder completely.

Finally, run:

```bash
yarn rw prisma migrate dev
```

All of the changes we made will be consolidated into a single, new migration file and applied to the Railway database instance. You can name this one something like "initial schema".

That's it for the database setup! Now to let Netlify know about it.

### Netlify

So the database is settled, but we need to actually put our code on the internet somewhere. That's where Netlify comes in.

Before we setup Netlify we'll need to setup our code with a setup command. Setup!

```bash
yarn rw setup deploy netlify
```

This adds a `netlify.toml` config file in the root of the project that is good to go as-is, but you can tweak it as your app grows (check out the comments at the top of the file for links to resources about customizing). Make sure you commit and push up these code changes to your repo.

And with that, we're ready to setup Netlify itself.

:::warning
While you may be tempted to use the [Netlify CLI](https://cli.netlify.com) commands to [build](https://cli.netlify.com/commands/build) and [deploy](https://cli.netlify.com/commands/deploy) your project directly from you local project directory, doing so **will lead to errors when deploying and/or when running functions**. I.e. errors in the function needed for the GraphQL server, but also other serverless functions.

The main reason for this is that these Netlify CLI commands simply build and deploy -- they build your project locally and then push the dist folder. That means that when building a RedwoodJS project, the [Prisma client is generated with binaries matching the operating system at build time](https://cli.netlify.com/commands/link) -- and not the [OS compatible](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#binarytargets-options) with running functions on Netlify. Your Prisma client engine may be `darwin` for OSX or `windows` for Windows, but it needs to be `debian-openssl-1.1.x` or `rhel-openssl-1.1.x`. If the client is incompatible, your functions will fail.

Therefore, **please follow the instructions below** to sync your GitHub (or other compatible source control service) repository with Netlify and allow their build and deploy system to manage deployments.
:::

#### Signup

[Create a Netlify account](https://app.netlify.com/signup) if you don't have one already. Once you've signed up and verified your email done just click the **New site from Git** button at the upper right:

![Netlify New Site picker](https://user-images.githubusercontent.com/300/73697486-85f84a80-4693-11ea-922f-0f134a3e9031.png)

Now just authorize Netlify to connect to your git hosting provider and find your repo. When the deploy settings come up you can leave everything as the defaults and click **Deploy site**.

Netlify will start building your app and it will eventually say the deployment failed. Why? We haven't told it where to find our database yet!

#### Environment Variables

Go back to the main site page and then to **Site configuration** on the left, and then **Environment variables**. Click the **Add a variable** button, then choose **Add a single variable** from the drop-down. This is where we'll paste the database connection URI we got from Railway (note the **Key** is "DATABASE_URL"). After pasting the value, append `?connection_limit=1` to the end. The URI will have the following format: `postgresql://<user>:<pass>@<url>/<db>?connection_limit=1`. The default values for Scopes and Values can be left as is. Click **Create variable** to proceed.

:::tip

This connection limit setting is [recommended by Prisma](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#recommended-connection-pool-size-1) when working with relational databases in a Serverless context.
:::

![Screenshot_2024-03-19_231931_dkf](https://github.com/redwoodjs/redwood/assets/158021342/973c827f-1098-4952-b720-d982bc668853)

We'll need to add one more environment variable, `SESSION_SECRET` which contains a big long string that's used to encrypt the session cookies for dbAuth. This was included in development when you installed dbAuth, but now we need to tell Netlify about it. If you look in your `.env` file you'll see it at the bottom, but we want to create a unique one for every environment we deploy to (each developer should have a unique one as well). We've got a CLI command to create a new one:

```bash
yarn rw g secret
```

Copy that over to Netlify along with `DATABASE_URL`:

![Adding ENV var](https://user-images.githubusercontent.com/2931245/204148740-f8aaa276-e9b1-4ffc-a842-7602a1e0111a.png)

#### IT'S ALIVE

Now go over to the **Deploys** tab in the top nav and open the **Trigger deploy** dropdown on the right, then finally choose **Deploy site**:
![Trigger deploy](https://user-images.githubusercontent.com/300/83187760-835aae80-a0e3-11ea-9733-ff54969bba1f.png)
With a little luck (and SCIENCE) it will complete successfully! You can click the **Preview** button at the top of the deploy log page, or go back and click the URL of your Netlify site towards the top:
![Netlify URL](https://user-images.githubusercontent.com/300/83187909-bef57880-a0e3-11ea-97dc-e557248acd3a.png)
:::info
If you view a deploy via the **Preview** button notice that the URL contains a hash of the latest commit. Netlify will create one of these for every push to `main` but it will only ever show this exact commit, so if you deploy again and refresh you won't see any changes. The real URL for your site (the one you get from your site's homepage in Netlify) will always show the latest successful deploy. See [Branch Deploys](#branch-deploys) below for more info.
:::

Did it work? If you see "Empty" under the About and Contact links then it did! Yay! You're seeing "Empty" because you don't have any posts in your brand new production database so head to `/admin/posts` and create a couple, then go back to the homepage to see them.

If the deploy failed, check the log output in Netlify and see if you can make sense of the error. If the deploy was successful but the site doesn't come up, try opening the web inspector and look for errors. Are you sure you pasted the entire Postgres connection string correctly? If you're really, really stuck head over to the [Redwood Community](https://community.redwoodjs.com) and ask for help.

#### Custom Subdomain

You can customize the subdomain that your site is published at (who wants to go to `agitated-mongoose-849e99.netlify.app`??) by going to **Site Settings > Domain Management > Domains > Custom Domains**. Open up the **Options** menu and select **Edit site name**. Your site should be available at your custom subdomain (`redwood-tutorial.netlify.app` is much nicer) almost immediately.

![image](https://user-images.githubusercontent.com/300/154521450-ee64c77c-e658-4045-9dd6-119858b6739e.png)

Note that your subdomain needs to be unique across all of Netlify, so `blog.netlify.app` is probably already taken! You can also connect a completely custom domain: click the **Add custom domain** button.

#### Branch Deploys

Another neat feature of Netlify is _Branch Deploys_. When you create a branch and push it up to your repo, Netlify will build that branch at a unique URL so that you can test your changes, leaving the main site alone. Once your branch is merged to `main` then a deploy at your main site will run and your changes will show to the world. To enable Branch Deploys go to **Site settings** > **Build & deploy** > **Continuous Deployment** and under the **Branches** section click **Edit settings** and change **Branch deploys** to "All". You can also enable _Deploy previews_ which will create them for any pull requests against your repo.
![Netlify settings screenshot](https://user-images.githubusercontent.com/7134153/182321177-2d845d77-36f4-4146-9fb9-55ae83a30983.png)
:::tip
You also have the ability to "lock" the `main` branch so that deploys do not automatically occur on every push—you need to manually tell Netlify to deploy the latest, either by going to the site or using the [Netlify CLI](https://cli.netlify.com/).
:::

### Database Concerns

#### Connections

In this tutorial, your serverless functions will be connecting directly to the Postgres database. Because Postgres has a limited number of concurrent connections it will accept, this does not scale—imagine a flood of traffic to your site which causes a 100x increase in the number of serverless function calls. Netlify (and behind the scenes, AWS) will happily spin up 100+ serverless Lambda instances to handle the traffic. The problem is that each one will open its own connection to your database, potentially exhausting the number of available connections. The proper solution is to put a connection pooling service in front of Postgres and connect to that from your lambda functions. To learn how to do that, see the [Connection Pooling](../../connection-pooling.md) guide.

#### Security

Your database will need to be open to the world because you never know what IP address a serverless function will have when it runs. You could potentially get the CIDR block for ALL IP addresses that your hosting provider has and only allow connections from that list, but those ranges usually change over time and keeping them in sync is not trivial. As long as you keep your DB username/password secure you should be safe, but we understand this is not the ideal solution.
As this form of full-stack Jamstack gains more prominence we're counting on database providers to provide more robust, secure solutions that address these issues. Our team is working closely with several of them and will hopefully have good news to share in the near future!

##### The Signup Problem

Speaking of security, you may have noticed a glaring security hole in our build: anyone can come along and sign up for a new account and start creating blog posts! That's not ideal. A quick and easy solution would be to remove the `signup` route after you've created your own account: now there's no signup page accessible and a normal human will give up. But what about devious hackers?
dbAuth provides an API for signup and login that the client knows how to call, but if someone were crafty enough they could make their own API calls to that same endpoint and still create a new user even without the signup page! Ahhhh! We finally made it through this long (but fun!) tutorial, can't we just take a break and put our feet up? Unfortunately, the war against bad actors never really ends.
To close this hole, check out `api/src/functions/auth.js`, this is where the configuration for dbAuth lives. Take a gander at the `signupOptions` object, specifically the `handler()` function. This defines what to do with the user data that's submitted on the signup form. If you simply have this function return `false`, instead of creating a user, we will have effectively shut the door on the API signup hack.
Commit your changes and push your repo, and Netlify will re-deploy your site. Take that you hacking [snollygosters](https://www.merriam-webster.com/dictionary/snollygoster)!
![100% accurate portrayal of hacking](https://user-images.githubusercontent.com/300/152592915-609747f9-3d68-4d72-8cd8-e120ef83b640.gif)
