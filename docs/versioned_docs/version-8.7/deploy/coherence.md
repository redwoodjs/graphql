---
description: Serverful deploys on GCP or AWS via Coherence's full-lifecycle environment automation
---

# Deploy to Coherence

[Coherence](https://www.withcoherence.com/) delivers automated environments across the full software development lifecycle, without requiring you to glue together your own mess of open source tools to get a world-class develper experience for your team. Coherence is focused on serving startups, who are doing mission-critical work. With one simple configuration, Coherence offers:

- Cloud-hosted development environments, based on VSCode. Similar to Gitpod or GitHub CodeSpaces
- Production-ready CI/CD running in your own GCP/AWS account, including: database migration/seeding/snapshot loading, parallelized tests, container building and docker registry management
- Full-stack branch previews. Vercel/Netlify-like developer experience for arbitrary container apps, including dependencies such as CDN, redis, and database resources
- Staging and production environment management in your AWS/GCP accounts. Production runs in its own cloud account (AWS) or project (GCP). Integrated secrets management across all environment types with a developer-friendly UI

## Coherence Prerequisites

To deploy to Coherence, your Redwood project needs to be hosted on GitHub and you must have an [AWS](https://docs.withcoherence.com/docs/overview/aws-deep-dive) or [GCP](https://docs.withcoherence.com/docs/overview/gcp-deep-dive) account.

## Coherence Deploy

:::warning Prerender doesn't work with Coherence yet

You can see its current status and follow updates here on GitHub: https://github.com/redwoodjs/redwood/issues/8333.

But if you don't use prerender, carry on!

:::

If you want to deploy your Redwood project on Coherence, run the setup command:

```
yarn rw setup deploy coherence
```

The command will inspect your Prisma config to determine if you're using a supported database (at the moment, only `postgres` or `mysql` are supported on Coherence).

Then follow the [Coherence Redwood deploy docs](https://docs.withcoherence.com/docs/configuration/frameworks#redwood-js) for more information, including if you want to set up:

- a redis server
- database migration/seeding/snapshot loading
- cron jobs or async workers
- object storage using Google Cloud Storage or AWS's S3
