---
title: Contributing
description: There's several ways to contribute to Redwood
slug: contributing
---

# Contributing: Overview and Orientation

Love Redwood and want to get involved? You’re in the right place and in good company! As of this writing, there are more than [250 contributors](https://github.com/redwoodjs/redwood/blob/main/README.md#contributors) who have helped make Redwood awesome by contributing code and documentation. This doesn't include all those who participate in the vibrant, helpful, and encouraging Forums and Discord, which are both great places to get started if you have any questions.

There are several ways you can contribute to Redwood:

- join the [community Forums](https://community.redwoodjs.com/) and [Discord server](https://discord.com/invite/redwoodjs) — encourage and help others 🙌
- [triage issues on the repo](https://github.com/redwoodjs/redwood/issues) and [review PRs](https://github.com/redwoodjs/redwood/pulls) 🩺
- write and edit [docs](#contributing-docs) ✍️
- and of course, write code! 👩‍💻

_Before interacting with the Redwood community, please read and understand our [Code of Conduct](https://github.com/redwoodjs/redwood/blob/main/CODE_OF_CONDUCT.md#contributor-covenant-code-of-conduct)._

> ⚡️ **Quick Links**
>
> There are several contributing docs and references, each covering specific topics:
>
> 1. 🧭 **Overview and Orientation** (👈 you are here)
> 2. 📓 [Reference: Contributing to the Framework Packages](https://github.com/redwoodjs/redwood/blob/main/CONTRIBUTING.md)
> 3. 🪜 [Step-by-step Walkthrough](contributing-walkthrough.md) (including Video Recording)
> 4. 📈 [Current Project Status](https://github.com/orgs/redwoodjs/projects/11)
> 5. 🤔 What should I work on?
>    - [Good First Issue](https://redwoodjs.com/good-first-issue)
>    - [Discovery Process and Open Issues](#what-should-i-work-on)

## The Characteristics of a Contributor

More than committing code, contributing is about human collaboration and relationship. Our community mantra is **“By helping each other be successful with Redwood, we make the Redwood project successful.”** We have a specific vision for the effect this project and community will have on you — it should give you superpowers to build+create, progress in skills, and help advance your career.

So who do you need to become to achieve this? Specifically, what characteristics, skills, and capabilities will you need to cultivate through practice? Here are our suggestions:

- Empathy
- Gratitude
- Generosity

All of these are applicable in relation to both others and yourself. The goal of putting them into practice is to create trust that will be a catalyst for risk-taking (another word to describe this process is “learning”!). These are the ingredients necessary for productive, positive collaboration.

And you thought all this was just about opening a PR 🤣 Yes, it’s a super rewarding experience. But that’s just the beginning!

## What should I work on?

Even if you know the mechanics, it’s hard to get started without a starting place. Our best advice is this — dive into the Redwood Tutorial, read the docs, and build your own experiment with Redwood. Along the way, you’ll find typos, out-of-date (or missing) documentation, code that could work better, or even opportunities for improving and adding features. You’ll be engaging in the Forums and Chat and developing a feel for priorities and needs. This way, you’ll naturally follow your own interests and sooner than later intersect “things you’re interested in” + “ways to help improve Redwood”.

There are other more direct ways to get started as well, which are outlined below.

### Project Boards and GitHub Issues

The Redwood Core Team is working publicly — progress is updated daily on the [Release Project Board](https://github.com/orgs/redwoodjs/projects/11).

Eventually, all this leads you back to Redwood’s GitHub Issues page. Here you’ll find open items that need help, which are organized by labels. There are four labels helpful for contributing:

1. [Good First Issue](https://github.com/redwoodjs/redwood/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22): these items are more likely to be an accessible entry point to the Framework. It’s less about skill level and more about focused scope.
2. [Help Wanted](https://github.com/redwoodjs/redwood/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22): these items especially need contribution help from the community.
3. [Bugs 🐛](https://github.com/redwoodjs/redwood/issues?q=is%3Aissue+is%3Aopen+label%3Abug%2Fconfirmed): last but not least, we always need help with bugs. Some are technically less challenging than others. Sometimes the best way you can help is to attempt to reproduce the bug and confirm whether or not it’s still an issue.

### Create a New Issue

Anyone can create a new Issue. If you’re not sure that your feature or idea is something to work on, start the discussion with an Issue. Describe the idea and problem + solution as clearly as possible, including examples or pseudo code if applicable. It’s also very helpful to `@` mention a maintainer or Core Team member that shares the area of interest.

Just know that there’s a lot of Issues that shuffle every day. If no one replies, it’s just because people are busy. Reach out in the Forums, Chat, or comment in the Issue. We intend to reply to every Issue that’s opened. If yours doesn’t have a reply, then give us a nudge!

Lastly, it can often be helpful to start with brief discussion in the community Chat or Forums. Sometimes that’s the quickest way to get feedback and a sense of priority before opening an Issue.

## Contributing Code

Redwood's composed of many packages that are designed to work together. Some of these packages are designed to be used outside Redwood too!

Before you start contributing, you'll want to set up your local development environment. The Redwood repo's top-level [contributing guide](https://github.com/redwoodjs/redwood/blob/main/CONTRIBUTING.md#local-development) walks you through this. Make sure to give it an initial read.

For details on contributing to a specific package, see the package's README (links provided in the table below). Each README has a section named Roadmap. If you want to get involved but don't quite know how, the Roadmap's a good place to start. See anything that interests you? Go for it! And be sure to let us know&mdash;you don't have to have a finished product before opening an issue or pull request. In fact, we're big fans of [Readme Driven Development](https://tom.preston-werner.com/2010/08/23/readme-driven-development.html).

What you want to do not on the roadmap? Well, still go for it! We love spikes and proof-of-concepts. And if you have a question, just ask!

### RedwoodJS Framework Packages

| Package                                                                                                                 | Description                                                                                                                                                                                                  |
| :---------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@redwoodjs/api-server`](https://github.com/redwoodjs/redwood/blob/main/packages/api-server/README.md)                 | Run a Redwood app using Fastify server (alternative to serverless API)                                                                                                                                       |
| [`@redwoodjs/api`](https://github.com/redwoodjs/redwood/blob/main/packages/api/README.md)                               | Infrastructure components for your applications UI including logging, webhooks, authentication decoders and parsers, as well as tools to test custom serverless functions and webhooks                       |
| [`@redwoodjs/auth`](https://github.com/redwoodjs/redwood/blob/main/packages/auth/README.md#contributing)                | A lightweight wrapper around popular SPA authentication libraries                                                                                                                                            |
| [`@redwoodjs/cli`](https://github.com/redwoodjs/redwood/blob/main/packages/cli/README.md)                               | All the commands for Redwood's built-in CLI                                                                                                                                                                  |
| [`@redwoodjs/codemods`](https://github.com/redwoodjs/redwood/blob/main/packages/codemods/README.md)                     | Codemods that automate upgrading a Redwood project                                                                                                                                                           |
| [`@redwoodjs/core`](https://github.com/redwoodjs/redwood/blob/main/packages/core/README.md)                             | Defines babel plugins and config files                                                                                                                                                                       |
| [`@redwoodjs/create-redwood-app`](https://github.com/redwoodjs/redwood/blob/main/packages/create-redwood-app/README.md) | Enables `yarn create redwood-app`&mdash;downloads the latest release of Redwood and extracts it into the supplied directory                                                                                  |
| [`@redwoodjs/eslint-config`](https://github.com/redwoodjs/redwood/blob/main/packages/eslint-config/README.md)           | Defines Redwood's eslint config                                                                                                                                                                              |
| [`@redwoodjs/forms`](https://github.com/redwoodjs/redwood/blob/main/packages/forms/README.md)                           | Provides Form helpers                                                                                                                                                                                        |
| [`@redwoodjs/graphql-server`](https://github.com/redwoodjs/redwood/blob/main/packages/graphql-server/README.md)         | Exposes functions to build the GraphQL API, provides services with `context`, and a set of envelop plugins to supercharge your GraphQL API with logging, authentication, error handling, directives and more |
| [`@redwoodjs/internal`](https://github.com/redwoodjs/redwood/blob/main/packages/internal/README.md)                     | Provides tooling to parse Redwood configs and get a project's paths                                                                                                                                          |
| [`@redwoodjs/prerender`](https://github.com/redwoodjs/redwood/blob/main/packages/prerender/README.md)                   | Defines functionality for prerendering static content                                                                                                                                                        |
| [`@redwoodjs/record`](https://github.com/redwoodjs/redwood/blob/main/packages/record/README.md)                         | ORM built on top of Prisma. It may be extended in the future to wrap other database access packages                                                                                                          |
| [`@redwoodjs/router`](https://github.com/redwoodjs/redwood/blob/main/packages/router/README.md)                         | The built-in router for Redwood                                                                                                                                                                              |
| [`@redwoodjs/structure`](https://github.com/redwoodjs/redwood/blob/main/packages/structure/README.md)                   | Provides a way to build, validate and inspect an object graph that represents a complete Redwood project                                                                                                     |
| [`@redwoodjs/telemetry`](https://github.com/redwoodjs/redwood/blob/main/packages/telemetry/README.md)                   | Provides functionality for anonymous data collection                                                                                                                                                         |
| [`@redwoodjs/testing`](https://github.com/redwoodjs/redwood/blob/main/packages/testing/README.md)                       | Provides helpful defaults when testing a Redwood project's web side                                                                                                                                          |
| [`@redwoodjs/web`](https://github.com/redwoodjs/redwood/blob/main/packages/web/README.md)                               | Configures a Redwood's app web side: wraps the Apollo Client in `RedwoodApolloProvider`; defines the Cell HOC                                                                                                |

## Contributing Docs

First off, thank you for your interest in contributing docs! Redwood prides itself on good developer experience, and that includes good documentation.

Before you get started, there's an implicit doc-distinction that we should make explicit: all the docs on redwoodjs.com are for helping people develop apps using Redwood, while all the docs on the Redwood repo are for helping people contribute to Redwood.

Although Developing and Contributing docs are in different places, they most definitely should be linked and referenced as needed. For example, it's appropriate to have a "Contributing" doc on redwoodjs.com that's context-appropriate, but it should link to the Framework's [CONTRIBUTING.md](https://github.com/redwoodjs/redwood/blob/main/CONTRIBUTING.md) (the way this doc does).

### How Redwood Thinks about Docs

Before we get into the how-to, a little explanation. When thinking about docs, we find [divio's documentation system](https://documentation.divio.com/) really useful. It's not necessary that a doc always have all four of the dimensions listed, but if you find yourself stuck, you can ask yourself questions like "Should I be explaining? Am I explaining too much? Too little?" to reorient yourself while writing.

### Docs for Developing Redwood Apps

redwoodjs.com has three kinds of Developing docs: References, How To's, and The Tutorial.
You can find References and How To's within their respective directories on the redwood/redwood repo: [docs/](https://github.com/redwoodjs/redwood/tree/main/docs) and [how-to/](https://github.com/redwoodjs/redwood/tree/main/docs/how-to).

The Tutorial is a standalone document that serves a specific purpose as an introduction to Redwood, an aspirational roadmap, and an example of developer experience. As such, it's distinct from the categories mentioned, although it's most similar to How To's.

#### References

References are explanation-driven how-to content. They're more direct and to-the-point than The Tutorial and How To's. The idea is much more about finding something or getting something done than any kind of learning journey.

Before you take on a doc, you should read [Forms](forms.md) and [Router](router.md); they have the kind of content you should be striving for. They're comprehensive yet conversational.

In general, don't be afraid to go into too much detail. We'd rather you err on the side of too much than too little. One tip for finding good content is searching the forum and repo for "prior art"&mdash;what are people talking about where this comes up?

#### How To's

How To's are tutorial-style content focused on a specific problem-solution. They usually have a beginner in mind (if not, they should indicate that they don't&mdash;put 'Advanced' or 'Deep-Dive', etc., in the title or introduction). How To's may include some explanatory text as asides, but they shouldn't be the majority of the content.

#### Making a Doc Findable

If you write it, will they read it? We think they will&mdash;if they can find it.

After you've finished writing, step back for a moment and consider the word(s) or phrase(s) people will use to find what you just wrote. For example, let's say you were writing a doc about configuring a Redwood app. If you didn't know much about configuring a Redwood app, a heading (in the nav bar to the left) like "redwood.toml" wouldn't make much sense, even though it _is_ the main configuration file. You'd probably look for "Redwood Config" or "Settings", or type "how to change Redwood App settings" in the "Search the docs" bar up top, or in Google.

That is to say, the most useful headings aren't always the most literal ones. Indexing is more than just underlining the "important" words in a text&mdash;it's identifying and locating the concepts and topics that are the most relevant to our readers, the users of our documentation.

So, after you've finished writing, reread what you wrote with the intention of making a list of two to three keywords or phrases. Then, try to use each of those in three places, in this order of priority:

- the left-nav menu title
- the page title or the first right-nav ("On this page") section title
- the introductory paragraph

### Docs for Contributing to the Redwood Repo

These docs are in the Framework repo, redwoodjs/redwood, and explain how to contribute to Redwood packages. They're the docs linked to in the table above.

In general, they should consist of more straightforward explanations, are allowed to be technically heavy, and should be written for a more experienced audience. But as a best practice for collaborative projects, they should still provide a Vision + Roadmap and identify the project-point person(s) (or lead(s)).

## What makes for a good Pull Request?

In general, we don’t have a formal structure for PRs. Our goal is to make it as efficient as possible for anyone to open a PR. But there are some good practices, which are flexible. Just keep in mind that after opening a PR there’s more to do before getting to the finish line:

1. Reviews from other contributors and maintainers
2. Update code and, after maintainer approval, merge-in changes to the `main` branch
3. Once PR is merged, it will be released and added to the next version Release Notes with a link for anyone to look at the PR and understand it.

Some tips and advice:

- **Connect the dots and leave a breadcrumb**: link to related Issues, Forum discussions, etc. Help others follow the trail leading up to this PR.
- **A Helpful Description**: What does the code in the PR do and what problem does it solve? How can someone use the code? Code sample, Screenshot, Quick Video… Any or all of this is so so good.
- **Draft or Work in Progress**: You don’t have to finish the code to open a PR. Once you have a start, open it up! Most often the best way to move an Issue forward is to see the code in action. Also, often this helps identify ways forward before you spend a lot of time polishing.
- **Questions, Items for Discussion, Etc.**: Another reason to open a Draft PR is to ask questions and get direction via review.
- **Loop in a Maintainer for Feedback and Review**: ping someone with an `@`. And nudge again in a few days if there’s no reply. We appreciate it and truly don’t want the PR to get lost in the shuffle!
- **Next Steps**: Once the PR is merged, will there be a follow up step? If so, link to an Issue. How about Docs to-do or Docs to-merge?

The best thing you can do is look through existing PRs, which will give you a feel for how things work and what you think is helpful.

### Example PR

If you’re looking for an example of “what makes a good PR”, look no further than this one by Kim-Adeline:

- [Convert component generator to TS #632](https://github.com/redwoodjs/redwood/pull/632)

Not every PR needs this much information. But it’s definitely helpful when it does!
