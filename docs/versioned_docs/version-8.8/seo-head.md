---
description: Use meta tags to set page info for SEO
---

# SEO & `<meta>` tags

Search Engine Optimization is a dark art that some folks dedicate their entire lives to. We've add a couple of features to Redwood to make HTML-based SEO fairly simple.

## Adding a Title

You certainly want to change the title of your Redwood app from the default of "Redwood App." You can start by adding or modifying `title` inside of `/redwood.toml`

```diff title=redwood.toml
[web]
- title = "Redwood App"
+ title = "My Cool App"
  port = 8910
  apiUrl = "/.redwood/functions"
```

This title (the app title) is used by default for all your pages if you don't define another one.
It will also be used for the title template.

### Title Template

Now that you have the app title set, you probably want some consistence with the page title, that's what the title template is for.

Add `titleTemplate` as a prop for `RedwoodProvider` to have a title template for every page.

```diff title=web/src/App.(tsx|jsx)
-  <RedwoodProvider>
+  <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
    /* ... */
  <RedwoodProvider />
```

You can use whatever formatting you'd like in here. Some examples:

```jsx
"%PageTitle | %AppTitle" => "Home Page | Redwood App"

"%AppTitle · %PageTitle" => "Redwood App · Home Page"

"%PageTitle : %AppTitle" => "Home Page : Redwood App"
```

## Adding to Page `<head>`

So you want to change the title of your page, or add elements to the `<head>` of the page? We've got you!

Let's say you want to change the title of your About page, Redwood provides a built-in `<Head>` component, which you can use like this:

```diff title=web/src/pages/AboutPage/AboutPage.(tsx|jsx)
+import { Head } from '@redwoodjs/web'

const AboutPage = () => {
  return (
    <div>
      <h2>AboutPage</h2>
+     <Head>
+       <title>About the team</title>
+     </Head>
```

You can include any valid `<head>` tag in here that you like. However, Redwood also provides a utility component [&lt;Metadata&gt;](#setting-meta-tags-and-opengraph-directives-with-metadata).

:::caution `<MetaTags>` Deprecation

Prior to Redwood 6.6.0 this component was called `<MetaTags>` and had several special hard-coded props like `ogContentUrl`, which didn't properly map to the OpenGraph spec. We'll still render `<MetaTags>` for the foreseeable future, but it's deprecated and you should migrate to `<Metadata>` if you have an existing app.

:::

### What About Nested Tags?

Redwood uses [react-helmet-async](https://github.com/staylor/react-helmet-async) underneath, which will use the tags furthest down your component tree.

For example, if you set title in your Layout, and a title in your Page, it'll render the one in Page - this way you can override the tags you wish, while sharing the tags defined in Layout.

:::info Bots & `<meta>` Tags

For these headers to appear to bots and scrapers e.g. for twitter to show your title, you have to make sure your page is prerendered. If your content is static you can use Redwood's built-in [Prerender](prerender.md). For dynamic tags, check the [Dynamic head tags](#dynamic-tags)

:::

## Setting `<meta>` Tags and OpenGraph Directives with `<Metadata>`

Often we want to set more than just the title and description of the page – most commonly [OpenGraph](https://ogp.me/) headers.

Redwood provides a convenience component `<Metadata>` to help you create most of these `<meta>` tags for you with a more concise syntax. But, you can also pass children and define any custom content that you want.

Here's an example setting some common meta, including a page title, description, `og:image` and an `http-equiv`:

```jsx
import { Metadata } from '@redwoodjs/web'

const AboutPage = () => {
  return (
    <div>
      <Metadata
        title="About page"
        description="About the awesome team"
        og={{ image: "https://example.com/images/og.png", url: "https://example.com/start" }}
        robots="nofollow"
      >
        <meta httpEquiv="content-type" content="text/html; charset=UTF-8" />
      </Metadata>

      <h2>About Page</h2>
      <p className="font-light">This is the about page!</p>
    </div>
  )
}

export default AboutPage
```

This code would be transformed into this HTML and injected into the `<head>` tag:

```html
<title>About page</title>
<meta name="title" content="About page" />
<meta name="description" content="About the awesome team" />
<meta name="robots" content="nofollow" />
<meta property="og:title" content="About page" />
<meta property="og:description" content="About the awesome team" />
<meta property="og:image" content="https://example.com/images/og.png" />
<meta property="og:url" content="https://example.com/start" />
<meta property="og:type" content="website" />
<meta http-equiv="content-type" content="text/html; charset=UTF-8" />
```

Setting an `og:image` is how sites like Facebook and Slack can show a preview of a URL when pasted into a post (also known as "unfurling"):

![Typical URL unfurl](/img/facebook_unfurl.png)

Sites like GitHub go a step farther than a generic image by actually creating an image for a repo on the fly, including details about the repo itself:

![GitHub's og:image for the redwood repo](https://opengraph.githubassets.com/322ce8081bb85a86397a59494eab1c0fbe942b5104461f625e2c973c46ae4179/redwoodjs/redwood)

If you want to write your own `<meta>` tags, skipping the interpolation that `<Metadata>` does for you, you can pass them as children to `<Metadata>` or just write them into the `<head>` tag as normal.

### `<Metadata>` Props

For the most part `<Metadata>` creates simple `<meta>` tags based on the structure of the props you pass in. There are a couple of special behaviors described below.

#### Plain Key/Value Props

Any "plain" key/value prop will be turned into a `<meta>` tag with `name` and `content` attributes:

```jsx
<Metadata description="Lorem ipsum dolar sit amet..." />
// generates
<meta name="description" content="Lorem ipsum dolar sit amet..." />
```

Child elements are just copied 1:1 to the resulting output:

```jsx
<Metadata description="Lorem ipsum dolar sit amet...">
  <meta httpEquiv="refresh" content="30" />
</Metadata>
// generates
<meta name="description" content="Lorem ipsum dolar sit amet..." />
<meta http-equiv="refresh" content="30" />
```

#### Passing Objects to Props

Any props that contain an object will create a `<meta>` tag with `property` and `content` attributes, and the `property` being the names of the nested keys with a `:` between each:

```jsx
<Metadata music={{ album: { track: 12 } }}/>
// generates
<meta property="music:album:track" content="12" />
```

This is most commonly used to create the "nested" structure that a spec like OpenGraph uses:

```jsx
<Metadata og={{ image:"http://host.test/image.jpg" />
// generates
<meta property="og:image" content="http://host.test/image.jpg" />
```

You can create multiple `<meta>` tags with the same name/property (allowed by the OpenGraph spec) by using an array:

```jsx
<Metadata og={{ image: ["http://host.test/image1.jpg", "http://host.test/image2.jpg"] />
// generates
<meta property="og:image" content="http://host.test/image1.jpg" />
<meta property="og:image" content="http://host.test/image2.jpg" />
```

You can combine nested objects with strings to create any structure you like:

```jsx
<Metadata
  og={{
    image: [
      'http://host.test/image1.jpg',
      { width: 320, height: 240 },
      'http://host.test/image2.jpg',
      'http://host.test/image3.jpg',
      { width: 1024 },
      { height: 768 },
    ],
  }}
/>
// generates
<meta property="og:image" content="http://host.test/image1.jpg" />
<meta property="og:image:width" content="320" />
<meta property="og:image:height" content="240" />
<meta property="og:image" content="http://host.test/image2.jpg" />
<meta property="og:image" content="http://host.test/image3.jpg" />
<meta property="og:image:width" content="1024" />
<meta property="og:image:height" content="768" />
```

#### Special OpenGraph Helpers

If you define _any_ `og` prop, we will copy any `title` and `description` to an `og:title` and `og:description`:

```jsx
<Metadata title="My Website" og />
// generates
<meta name="title" content="My Website" />
<meta property="og:title" content="My Website" />
```

You can override this behavior by explicitly setting `og:title` or `og:description` to `null`:

```jsx
<Metadata title="My Website" og={{ title: null }}/>
// generates
<meta name="title" content="My Website" />
```

Of course, if you don't want any auto-generated `og` tags, then don't include any `og` prop at all!

In addition to `og:title` and `og:description`, if you define _any_ `og` prop we will generate an `og:type` set to `website`:

```jsx
<Metadata og />
// generates
<meta property="og:type" content="website" />
```

You can override the `og:type` by setting it directly:

```jsx
<Metadata og={{ type: 'music:album' }}/>
// generates
<meta property="og:type" content="music:album" />
```

#### Other Special Cases

If you define a `title` prop we will automatically prepend a `<title>` tag to the output:

```jsx
<Metadata title="My Website" />
// generates
<title>My Website</title>
<meta name="title" content="My Website" />
```

If you define a `charSet` prop we will create a `<meta>` tag with the `charset` attribute:

```jsx
<Metadata charSet="utf-8" />
// generates
<meta charset="utf-8" />
```

We simplified some of the examples above by excluding the generated `<title>` and `og:type` tags, so here's the real output if you included `title` and `og` props:

```jsx
<Metadata title="My Website" og />
// generates
<title>My Website</title>
<meta name="title" content="My Website" />
<meta property="og:title" content="My Website" />
<meta property="og:type" content="website" />

```

:::info Do I need to apply these same tags over and over in every page?

Some `<meta>` tags, like `charset` or `locale` are probably applicable to the entire site, in which case it would be simpler to just include these once in your `index.html` instead of having to set them manually on each and every page/cell of your site.

:::

This should allow you to create a fairly full-featured set of `<meta>` tags with minimal special syntax! A typical `<Metadata>` invocation could look like:

```jsx
<Metadata
  title="My Website"
  description="An amazing website created with RedwoodJS"
  robots="noindex,nofollow"
  og={{ image: "https://example.com/images/og-image.png" }}
  twitter={{
    card: 'summary',
    site: '@mysite',
    creator: '@redwoodjs'
  }}
/>
```

## Dynamic tags

Bots will pick up our tags if we've prerendered the page, but what if we want to set the `<meta>` based on the output of the Cell?

:::info Prerendering

As of v3.x, Redwood supports prerendering your [Cells](https://redwoodjs.com/docs/cells) with the data you were querying. For more information please refer [to this section](https://redwoodjs.com/docs/prerender#cell-prerendering).

:::

Let's say in our `PostCell`, we want to set the title to match the `Post`.

```jsx
import { Metadata } from '@redwoodjs/web'

import Post from 'src/components/Post/Post'

export const QUERY = gql`
  query FindPostById($id: Int!) {
    post: post(id: $id) {
      title
      snippet
      author {
        name
      }
    }
  }
`

export const Loading = /* ... */

export const Empty = /* ... */

export const Success = ({ post }) => {
  return (
    <>
      <Metadata
        title={post.title}
        author={post.author.name}
        description={post.snippet}
      />
      <Post post={post} />
    </>
  )
}
```

Once the `Success` component renders, it will update your page's `<title>` and set the relevant `<meta>` tags for you!
