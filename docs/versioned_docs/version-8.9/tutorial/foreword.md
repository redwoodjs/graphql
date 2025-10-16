# RedwoodJS: The Tutorial

Welcome to Redwood! If you haven't yet, check out the [Redwood README](https://github.com/redwoodjs/redwood/blob/main/README.md) to get a little background on why we created Redwood and the problems it's meant to solve. Redwood brings several existing technologies together for the first time into what we think is the future of database-backed single page applications.

In this tutorial we're going to build a blog engine. In reality a blog is probably not the ideal candidate for a Redwood app: blog articles can be stored in a CMS and statically generated to HTML files and served as flat files from a CDN (the classic [Jamstack](https://jamstack.org/) use case). But as most developers are familiar with a blog, and it uses all of the features we want to demonstrate, we decided to build one anyway.

If you went through an earlier version of this tutorial you may remember it being split into parts 1 and 2. That was an artifact of the fact that most features demonstrated in part 2 didn't exist in the framework when part 1 was written. Once they were added we created part 2 to contain just those new features. Now that everything is integrated and working well we've moved each section into logically grouped chapters.

## Callouts

You'll find some callouts throughout the text to draw your attention:

:::tip

They might look like this...

:::

:::warning

or sometimes like this...

:::

:::danger

or maybe even like this!

:::

It's usually something that goes into more detail about a specific point, refers you to further reading, or calls out something important you should know. Here comes one now:

:::info

This tutorial assumes you are using version 7.0.0 or greater of RedwoodJS.

:::

Let's get started!
