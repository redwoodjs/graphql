---
description: 'Learn how to build dashboards fast using the Tremor React library of data visualization components.'
---

# Build Dashboards Fast with Tremor

[Tremor](https://www.tremor.so) is a React library to build dashboards fast. Its modular components are fully open-source, made by data scientists and software engineers with a sweet spot for design.

In this how to, you'll learn how to

- setup tremor in a new or existing RedwoodJS app
- use tremor components to layout a new dashboard
- use a chart and card component to visualize static data
- access a GitHub repo to make your dashboard dynamic using an [example RedwoodJS app](https://github.com/redwoodjs/redwoodjs-tremor-dashboard-demo)

## Live Demo

See what's possible with a [dynamic dashboard live demo](https://tremor-redwood-dashboard-demo.netlify.app) build with RedwoodJS and Tremor.

Cool, right?

Let's get started!

## Create a New RedwoodJS Project

In our terminal, we create a new RedwoodJS project:

```bash
yarn create redwood-app my-project --ts
```

> **Note:** If you already have a RedwoodJS project, you can skip this step and continue with the next section.

If you do not want a TypeScript project, omit the `--ts` flag.

> **Important:** RedwoodJS prefers yarn over npm because a project is monorepo with api and web workspaces. You will install tremor and other web packages using yarn workspaces.

Use the Redwood setup command to install `TailwindCSS`, its peer dependencies, and create the `tailwind.config.js` file.

```bash
yarn rw setup ui tailwindcss
```

Install `tremor` in the web workspace from your command line via yarn.

```bash
yarn workspace web add @tremor/react
```

Install `heroicons version 1.0.6` from your command line via yarn.

```bash
yarn workspace web add @heroicons/react@1.0.6
```

Update tailwind config `web/config/tailwind.config.js` **including the path to the tremor** module.

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    'src/**/*.{js,jsx,ts,tsx}',
    '../node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

> **Note:** the path for node_modules is `../` because the web workspace is in a subdirectory of the root directory.

## Add a Dashboard Page

Generate a page from your command line.

```bash
yarn rw g page dashboard /
```

You will now have a new page at `web/src/pages/DashboardPage/DashboardPage.tsx` and `web/src/Routes.tsx` will have a new route added at:

```tsx filename="web/src/Routes.tsx"
// web/src/Routes.tsx`

<Route path="/" page={DashboardPage} name="dashboard" />
```

Add simple area chart to the `DashboardPage`:

```jsx
import { Grid, Col, Card, Title, AreaChart } from '@tremor/react'

import { MetaTags } from '@redwoodjs/web'

const DashboardPage = () => {
  const chartdata = [
    {
      date: 'Jan 22',
      SemiAnalysis: 2890,
      'The Pragmatic Engineer': 2338,
    },
    {
      date: 'Feb 22',
      SemiAnalysis: 2756,
      'The Pragmatic Engineer': 2103,
    },
    {
      date: 'Mar 22',
      SemiAnalysis: 3322,
      'The Pragmatic Engineer': 2194,
    },
    {
      date: 'Apr 22',
      SemiAnalysis: 3470,
      'The Pragmatic Engineer': 2108,
    },
    {
      date: 'May 22',
      SemiAnalysis: 3475,
      'The Pragmatic Engineer': 1812,
    },
    {
      date: 'Jun 22',
      SemiAnalysis: 3129,
      'The Pragmatic Engineer': 1726,
    },
  ]

  const dataFormatter = (number: number) => {
    return '$ ' + Intl.NumberFormat('us').format(number).toString()
  }

  return (
    <div className="m-12">
      <MetaTags title="Dashboard" description="Dashboard page" />

      <h1 className="text-2xl mb-12">Dashboard</h1>

      <Grid numCols={1} numColsSm={2} numColsLg={3} className="my-8 gap-6">
        <Col numColSpan={1} numColSpanLg={3}>
          <Card>
            <Title>Newsletter revenue over time (USD)</Title>
            <AreaChart
              className="h-72 mt-4"
              data={chartdata}
              index="date"
              categories={['SemiAnalysis', 'The Pragmatic Engineer']}
              colors={['indigo', 'green']}
              valueFormatter={dataFormatter}
            />
          </Card>
        </Col>
      </Grid>
    </div>
  )
}

export default DashboardPage
```

Start your RedwoodJS development server

```bash
yarn rw dev
```

Your app will start up and you should see the Dashboard page with an area with two `Newsletter revenue over time (USD)` data series.

## Add a new component for a KPI Card

Generate a component for a KPI (Key Performance Indicator) from your command line.

```bash
yarn rw g component KpiCard
```

You will now have a new React component at `/web/src/components/KpiCard/KpiCard.tsx`.

Update the `KpiCard` component to import the `Card` component and assemble a card using its default
styling.

To create our first KPI, we import the `Metric` and `Text` component and place them within the card component. We use [Tailwind CSS'](https://tailwindcss.com/docs/utility-first) utilities in the **className** property to reduce the card's width and to center it horizontally.

To make our KPI card more insightful, we add a `ProgressBar`, providing
contextual details about our metric. To align both text elements, we also import
the `Flex` component.

```tsx filename="/web/src/components/KpiCard/KpiCard.tsx"
// /web/src/components/KpiCard/KpiCard.tsx

import {
  BadgeDelta,
  DeltaType,
  Card,
  Flex,
  Metric,
  ProgressBar,
  Text,
} from '@tremor/react'

export type Kpi = {
  title: string
  metric: string
  progress: number
  metricTarget: string
  delta: string
  deltaType: DeltaType
}

interface Props {
  kpi: Kpi
}

const KpiCard = ({ kpi }: Props) => {
  return (
    <Card className="max-w-lg">
      <Flex alignItems="start">
        <div>
          <Text>{kpi.title}</Text>
          <Metric>{kpi.metric}</Metric>
        </div>
        <BadgeDelta deltaType={kpi.deltaType}>{kpi.delta}</BadgeDelta>
      </Flex>
      <Flex className="mt-4">
        <Text className="truncate">{`${kpi.progress}% (${kpi.metric})`}</Text>
        <Text>{kpi.metricTarget}</Text>
      </Flex>
      <ProgressBar percentageValue={kpi.progress} className="mt-2" />
    </Card>
  )
}

export default KpiCard
```

## Add the KPI Card component to your Dashboard

Import the `KpiCard` component and `Kpi` type.

```tsx
import KpiCard from 'src/components/KpiCard/KpiCard' // 👈 Import the KpiCard component
import type { Kpi } from 'src/components/KpiCard/KpiCard' // 👈 Import the Kpi type
```

Next, create the `kpi` data collection with sample data

```tsx
const kpis: Kpi[] = [
  // 👈 Create some sample KPI data
  {
    title: 'Sales',
    metric: '$ 12,699',
    progress: 15.9,
    metricTarget: '$ 80,000',
    delta: '13.2%',
    deltaType: 'moderateIncrease',
  },
  {
    title: 'Profit',
    metric: '$ 45,564',
    progress: 36.5,
    metricTarget: '$ 125,000',
    delta: '23.9%',
    deltaType: 'increase',
  },
  {
    title: 'Customers',
    metric: '1,072',
    progress: 53.6,
    metricTarget: '2,000',
    delta: '10.1%',
    deltaType: 'moderateDecrease',
  },
]
```

Then iterate over the collection to add a `KpiCard` inside new `Col` for each KPI data item:

```tsx
{
  kpis.map((kpi, i) => (
    <Col key={i} numColSpan={1}>
      <KpiCard kpi={kpi} />
    </Col>
  ))
}
```

Your Dashboard page should now look like:

```tsx
import { Grid, Col, Card, Title, AreaChart } from '@tremor/react'

import { MetaTags } from '@redwoodjs/web'

import KpiCard from 'src/components/KpiCard/KpiCard' // 👈 Import the KpiCard component
import type { Kpi } from 'src/components/KpiCard/KpiCard' // 👈 Import the Kpi type

const DashboardPage = () => {
  const chartdata = [
    {
      date: 'Jan 22',
      SemiAnalysis: 2890,
      'The Pragmatic Engineer': 2338,
    },
    {
      date: 'Feb 22',
      SemiAnalysis: 2756,
      'The Pragmatic Engineer': 2103,
    },
    {
      date: 'Mar 22',
      SemiAnalysis: 3322,
      'The Pragmatic Engineer': 2194,
    },
    {
      date: 'Apr 22',
      SemiAnalysis: 3470,
      'The Pragmatic Engineer': 2108,
    },
    {
      date: 'May 22',
      SemiAnalysis: 3475,
      'The Pragmatic Engineer': 1812,
    },
    {
      date: 'Jun 22',
      SemiAnalysis: 3129,
      'The Pragmatic Engineer': 1726,
    },
  ]

  const kpis: Kpi[] = [
    // 👈 Create some sample KPI data
    {
      title: 'Sales',
      metric: '$ 12,699',
      progress: 15.9,
      metricTarget: '$ 80,000',
      delta: '13.2%',
      deltaType: 'moderateIncrease',
    },
    {
      title: 'Profit',
      metric: '$ 45,564',
      progress: 36.5,
      metricTarget: '$ 125,000',
      delta: '23.9%',
      deltaType: 'increase',
    },
    {
      title: 'Customers',
      metric: '1,072',
      progress: 53.6,
      metricTarget: '2,000',
      delta: '10.1%',
      deltaType: 'moderateDecrease',
    },
  ]

  const dataFormatter = (number: number) => {
    return '$ ' + Intl.NumberFormat('us').format(number).toString()
  }

  return (
    <div className="m-12">
      <MetaTags title="Dashboard" description="Dashboard page" />

      <h1 className="mb-12 text-2xl">Dashboard</h1>

      <Grid numCols={1} numColsSm={2} numColsLg={3} className="my-8 gap-6">
        {kpis.map((kpi, i) => (
          <Col key={i} numColSpan={1}>
            <KpiCard kpi={kpi} />
          </Col>
        ))}
        <Col numColSpan={1} numColSpanLg={3}>
          <Card>
            <Title>Newsletter revenue over time (USD)</Title>
            <AreaChart
              className="mt-4 h-72"
              data={chartdata}
              index="date"
              categories={['SemiAnalysis', 'The Pragmatic Engineer']}
              colors={['indigo', 'green']}
              valueFormatter={dataFormatter}
            />
          </Card>
        </Col>
      </Grid>
    </div>
  )
}

export default DashboardPage
```

Congratulations! You made your first dashboard.

## Next Steps

Now that you have a Dashboard

1. Explore the other [components](https://www.tremor.so/components) and [blocks](https://www.tremor.so/blocks) that you can use to showcase your data

2. Learn how to make a [dynamic dashboard using RedwoodJS cells](https://github.com/redwoodjs/redwoodjs-tremor-dashboard-demo) to fetch data from a Prisma-backed database using GraphQL.

3. See a [dynamic dashboard live demo](https://tremor-redwood-dashboard-demo.netlify.app)!
