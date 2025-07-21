# A Second Page and a Link

Let's create an "About" page for our blog so everyone knows about the geniuses behind this achievement. We'll create another page using `redwood`:

```bash
yarn redwood generate page about
```

Notice that we didn't specify a route path this time. If you leave it off the `redwood generate page` command, Redwood will create a `Route` and give it a path that is the same as the page name you specified, prepended with a slash. In this case it will be `/about`.

:::info Code-splitting each page

As you add more pages to your app, you may start to worry that more and more code has to be downloaded by the client on any initial page load. Fear not! Redwood will automatically code-split on each Page, which means that initial page loads can be blazingly fast, and you can create as many Pages as you want without having to worry about impacting overall bundle size. If, however, you do want specific Pages to be included in the main bundle, you can [override the default behavior](../../router.md#not-code-splitting).

:::

[http://localhost:8910/about](http://localhost:8910/about) should show our new page:

![About page](https://user-images.githubusercontent.com/300/145647906-56b02a6c-b92c-40c6-9d37-860584ffaa6b.png)

But no one's going to find it by manually changing the URL so let's add a link from our homepage to the About page and vice versa. We'll start by creating a simple header and nav bar at the same time on the HomePage:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/HomePage/HomePage.jsx"
import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const HomePage = () => {
  return (
    <>
      <Metadata title="Home" description="Home page" />

      // highlight-start
      <header>
        <h1>Redwood Blog</h1>
        <nav>
          <ul>
            <li>
              <Link to={routes.about()}>About</Link>
            </li>
          </ul>
        </nav>
      </header>
      <main>Home</main>
      // highlight-end
    </>
  )
}

export default HomePage
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```jsx title="web/src/pages/HomePage/HomePage.tsx"
import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const HomePage = () => {
  return (
    <>
      <Metadata title="Home" description="Home page" />

      // highlight-start
      <header>
        <h1>Redwood Blog</h1>
        <nav>
          <ul>
            <li>
              <Link to={routes.about()}>About</Link>
            </li>
          </ul>
        </nav>
      </header>
      <main>Home</main>
      // highlight-end
    </>
  )
}

export default HomePage
```

</TabItem>
</Tabs>

Let's point out a few things here:

- Redwood loves [Function Components](https://www.robinwieruch.de/react-function-component). We'll make extensive use of [React Hooks](https://react.dev/reference/react) as we go and these are only enabled in function components. Now that Redwood is on React 18, we discourage using class components since they won't be able to take advantage of React's concurrent rendering features.
- Redwood's `<Link>` tag, in its most basic usage, takes a single `to` attribute. That `to` attribute calls a [_named route function_](../../router.md#link-and-named-route-functions) to generate the correct URL. The function has the same name as the `name` attribute on the `<Route>`:

  `<Route path="/about" page={AboutPage} name="about" />`

  If you don't like the name or path that `redwood generate` created for your route, feel free to change it in `Routes.{jsx,tsx}`! Named routes are awesome because if you ever change the path associated with a route (like going from `/about` to `/about-us`), you need only change it in `Routes.{jsx,tsx}` and every link using a named route function (`routes.about()`) will still point to the correct place! You can also pass a string to the `to` prop (`to="/about"`), but now if your path ever changed you would need to find and replace every instance of `/about` to `/about-us`.

### Back Home

Once we get to the About page we don't have any way to get back so let's add a link there as well:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/AboutPage/AboutPage.jsx"
import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const AboutPage = () => {
  return (
    <>
      <Metadata title="About" description="About page" />

      // highlight-start
      <header>
        <h1>Redwood Blog</h1>
        <nav>
          <ul>
            <li>
              <Link to={routes.about()}>About</Link>
            </li>
          </ul>
        </nav>
      </header>
      <main>
        <p>
          This site was created to demonstrate my mastery of Redwood: Look on my
          works, ye mighty, and despair!
        </p>
        <Link to={routes.home()}>Return home</Link>
      </main>
      // highlight-end
    </>
  )
}

export default AboutPage
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```jsx title="web/src/pages/AboutPage/AboutPage.tsx"
import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const AboutPage = () => {
  return (
    <>
      <Metadata title="About" description="About page" />

      // highlight-start
      <header>
        <h1>Redwood Blog</h1>
        <nav>
          <ul>
            <li>
              <Link to={routes.about()}>About</Link>
            </li>
          </ul>
        </nav>
      </header>
      <main>
        <p>
          This site was created to demonstrate my mastery of Redwood: Look on my
          works, ye mighty, and despair!
        </p>
        <Link to={routes.home()}>Return home</Link>
      </main>
      // highlight-end
    </>
  )
}

export default AboutPage
```

</TabItem>
</Tabs>

Great! Try that out in the browser and verify that you can get back and forth.

![image](https://user-images.githubusercontent.com/300/145899850-2906c2e3-4ec1-4f8a-9c95-e43b0f7da73f.png)

As a world-class developer you probably saw that copy-and-pasted `<header>` and gasped in disgust. We feel you. That's why Redwood has a little something called _Layouts_.
