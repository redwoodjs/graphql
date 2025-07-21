# Introduction to Storybook

Let's see what this Storybook thing is all about. Run this command to start up the Storybook server (you could stop your dev or test runners and then run this, or start another new terminal instance):

```bash
yarn rw storybook
```

After some compiling you should get a message saying that Storybook has started and it's available at [http://localhost:7910](http://localhost:7910)

![image](https://user-images.githubusercontent.com/300/153311732-21a62ee8-5bdf-45b7-b163-35a5ec0ce318.png)

If you poke around at the file tree on the left you'll see all of the components, cells, layouts and pages we created during the tutorial. Where did they come from? You may recall that every time we generated a new page/cell/component we actually created at least _three_ files:

- `Article.{jsx,tsx}`
- `Article.stories.{jsx,tsx}`
- `Article.test.{jsx,tsx}`

:::info

If you generated a cell then you also got a `.mock.{js,ts}` file (more on those later).

:::

Those `.stories.{jsx,tsx}` files are what makes the tree on the left side of the Storybook browser possible! From their [homepage](https://storybook.js.org/), Storybook describes itself as:

_"...an open source tool for developing UI components in isolation for React, Vue, Angular, and more. It makes building stunning UIs organized and efficient."_

So, the idea here is that you can build out your components/cells/pages in isolation, get them looking the way you want and displaying the correct data, then plug them into your full application.

When Storybook opened it should have opened **Components > Article > Generated** which is the generated component we created to display a single blog post. If you open `web/src/components/Article/Article.stories.{jsx,tsx}` you'll see what it takes to explain this component to Storybook, and it isn't much:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/Article/Article.stories.jsx"
import Article from './Article'

export const generated = () => {
  return (
    <Article
      article={{
        id: 1,
        title: 'First Post',
        body: `Neutra tacos hot chicken prism raw denim, put
              a bird on it enamel pin post-ironic vape cred
              DIY. Street art next level umami squid.
              Hammock hexagon glossier 8-bit banjo. Neutra
              la croix mixtape echo park four loko semiotics
              kitsch forage chambray. Semiotics salvia
              selfies jianbing hella shaman. Letterpress
              helvetica vaporware cronut, shaman butcher
              YOLO poke fixie hoodie gentrify woke
              heirloom.`,
        createdAt: '2020-01-01T12:34:45Z'
      }}
    />
  )
}

export default { title: 'Components/Article' }
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/Article/Article.stories.tsx"
import Article from './Article'

export const generated = () => {
  return (
    <Article
      article={{
        id: 1,
        title: 'First Post',
        body: `Neutra tacos hot chicken prism raw denim, put
              a bird on it enamel pin post-ironic vape cred
              DIY. Street art next level umami squid.
              Hammock hexagon glossier 8-bit banjo. Neutra
              la croix mixtape echo park four loko semiotics
              kitsch forage chambray. Semiotics salvia
              selfies jianbing hella shaman. Letterpress
              helvetica vaporware cronut, shaman butcher
              YOLO poke fixie hoodie gentrify woke
              heirloom.`,
        createdAt: '2020-01-01T12:34:45Z',
      }}
    />
  )
}

export default { title: 'Components/Article' }
```

</TabItem>
</Tabs>

You import the component you want to use and then all of the named exports in the file will be a single "story" as displayed in Storybook. In this case the generator named it "generated" which shows as the "Generated" story in the tree view:

```
Components
└── Article
    └── Generated
```

This makes it easy to create variants of your component and have them all displayed together.

:::info Where did that sample blog post data come from?

In your actual app you'd use this component like so:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx
<Article article={article} />
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx
<Article article={article} />
```

</TabItem>
</Tabs>

Where the `article` in that prop comes from somewhere outside of this component. Here in Storybook there is no "outside" of this component, so we just send the article object into the prop directly.

**But where did the pre-filled article data come from?**

We (the Redwood team) added that to the story in the `redwood-tutorial` repo to show you what a story might look like after you hook up some sample data. Several of the stories need data like this, some inline and some in those `.mock.{js,ts}` files. The rest of the tutorial will be showing you how to do this yourself with new components as you create them.

**Where did the _actual_ text in the body come from?**

[Hipster Ipsum](https://hipsum.co/), a fun alternative to Lorem Ipsum filler text!

:::
