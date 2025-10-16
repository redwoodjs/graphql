# Disable API/Database

Did you know you could deploy your Redwood app without an API layer or database? Maybe you have a simple static site that doesn't need any external data, or you only need to digest a simple JSON data structure that changes infrequently. So infrequently that changing the data can mean just editing a plain text file and deploying your site again.

Let's take a look at these scenarios and how you can get them working with Redwood.

## Assumptions

We assume you're deploying to Netlify in this recipe. Your mileage may vary for other providers or a custom build process.

## Remove the /api directory

Just delete the `/api` directory altogether and your app will still work in dev mode:

```bash
rm -rf api
```

You can also run `yarn install` to cleanup those packages that aren't used any more.

## Disable Prisma functionality

The `--prisma` and `--dm` flags are set to `true` by default and need to be set to `false` in the build command.

```toml {4}
[build]
  command = "yarn rw deploy netlify --prisma=false --dm=false"
```

While omitting these flags won't prevent you from developing the site in a local environment, not setting them to `false` will lead to a `'No Prisma Schema found'` error when you attempt to deploy your site to a production environment, at least when Netlify is the deployment target.

## Turn off the API build process

When it comes time to deploy, we need to let Netlify know that it shouldn't bother trying to look for any code to turn into AWS Lambda functions.

Open up `netlify.toml`. We're going to comment out one line:

```toml {4}
[build]
  command = "yarn rw deploy netlify --prisma=false --dm=false"
  publish = "web/dist"
  # functions = "api/dist/functions"

[dev]
  command = "yarn rw dev"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

If you just have a static site that doesn't need any data access at all (even our simple JSON file discussed above) then you're done! Keep reading to see how you can access a local data store that we'll deploy along with the web side of our app.

## Local JSON Fetch

Let's display a graph of the weather forecast for the week of Jan 30, 2017 in Moscow, Russia. If this seems like a strangely specific scenario it's because that's the example data we can quickly get from the [OpenWeather API](https://openweathermap.org/forecast16). Get the JSON data [here](https://samples.openweathermap.org/data/2.5/forecast/daily?id=524901&appid=b1b15e88fa797225412429c1c50c122a1) or copy the following and save it to a file at `web/public/forecast.json`:

```json
{
  "cod": "200",
  "message": 0,
  "city": {
    "geoname_id": 524901,
    "name": "Moscow",
    "lat": 55.7522,
    "lon": 37.6156,
    "country": "RU",
    "iso2": "RU",
    "type": "city",
    "population": 0
  },
  "cnt": 7,
  "list": [
    {
      "dt": 1485766800,
      "temp": {
        "day": 262.65,
        "min": 261.41,
        "max": 262.65,
        "night": 261.41,
        "eve": 262.65,
        "morn": 262.65
      },
      "pressure": 1024.53,
      "humidity": 76,
      "weather": [
        {
          "id": 800,
          "main": "Clear",
          "description": "sky is clear",
          "icon": "01d"
        }
      ],
      "speed": 4.57,
      "deg": 225,
      "clouds": 0,
      "snow": 0.01
    },
    {
      "dt": 1485853200,
      "temp": {
        "day": 262.31,
        "min": 260.98,
        "max": 265.44,
        "night": 265.44,
        "eve": 264.18,
        "morn": 261.46
      },
      "pressure": 1018.1,
      "humidity": 91,
      "weather": [
        {
          "id": 600,
          "main": "Snow",
          "description": "light snow",
          "icon": "13d"
        }
      ],
      "speed": 4.1,
      "deg": 249,
      "clouds": 88,
      "snow": 1.44
    },
    {
      "dt": 1485939600,
      "temp": {
        "day": 270.27,
        "min": 266.9,
        "max": 270.59,
        "night": 268.06,
        "eve": 269.66,
        "morn": 266.9
      },
      "pressure": 1010.85,
      "humidity": 92,
      "weather": [
        {
          "id": 600,
          "main": "Snow",
          "description": "light snow",
          "icon": "13d"
        }
      ],
      "speed": 4.53,
      "deg": 298,
      "clouds": 64,
      "snow": 0.92
    },
    {
      "dt": 1486026000,
      "temp": {
        "day": 263.46,
        "min": 255.19,
        "max": 264.02,
        "night": 255.59,
        "eve": 259.68,
        "morn": 263.38
      },
      "pressure": 1019.32,
      "humidity": 84,
      "weather": [
        {
          "id": 800,
          "main": "Clear",
          "description": "sky is clear",
          "icon": "01d"
        }
      ],
      "speed": 3.06,
      "deg": 344,
      "clouds": 0
    },
    {
      "dt": 1486112400,
      "temp": {
        "day": 265.69,
        "min": 256.55,
        "max": 266,
        "night": 256.55,
        "eve": 260.09,
        "morn": 266
      },
      "pressure": 1012.2,
      "humidity": 0,
      "weather": [
        {
          "id": 600,
          "main": "Snow",
          "description": "light snow",
          "icon": "13d"
        }
      ],
      "speed": 7.35,
      "deg": 24,
      "clouds": 45,
      "snow": 0.21
    },
    {
      "dt": 1486198800,
      "temp": {
        "day": 259.95,
        "min": 254.73,
        "max": 259.95,
        "night": 257.13,
        "eve": 254.73,
        "morn": 257.02
      },
      "pressure": 1029.5,
      "humidity": 0,
      "weather": [
        {
          "id": 800,
          "main": "Clear",
          "description": "sky is clear",
          "icon": "01d"
        }
      ],
      "speed": 2.6,
      "deg": 331,
      "clouds": 29
    },
    {
      "dt": 1486285200,
      "temp": {
        "day": 263.13,
        "min": 259.11,
        "max": 263.13,
        "night": 262.01,
        "eve": 261.32,
        "morn": 259.11
      },
      "pressure": 1023.21,
      "humidity": 0,
      "weather": [
        {
          "id": 600,
          "main": "Snow",
          "description": "light snow",
          "icon": "13d"
        }
      ],
      "speed": 5.33,
      "deg": 234,
      "clouds": 46,
      "snow": 0.04
    }
  ]
}
```

Any files that you put in `web/public` will be served by Netlify, skipping any build process.

Next let's have a React component get that data remotely and then display it on a page. For this example we'll generate a homepage:

```bash
yarn rw generate page home /
```

Next we'll use the browser's builtin `fetch()` function to get the data and then we'll just dump it to the screen to make sure it works:

```jsx
import { useState, useEffect } from 'react'

const HomePage = () => {
  const [forecast, setForecast] = useState({})

  useEffect(() => {
    fetch('/forecast.json')
      .then((response) => response.json())
      .then((json) => setForecast(json))
  }, [])

  return <div>{JSON.stringify(forecast)}</div>
}

export default HomePage
```

We use `useState` to keep track of the forecast data and `useEffect` to actually trigger the loading of the data when the component mounts. Now we just need a graph! Let's add [chart.js](https://www.chartjs.org/) for some simple graphing:

```bash
yarn workspace web add chart.js
```

Let's generate a sample graph:

```jsx {1,2,5,15-32,34}
import { useState, useEffect, useRef } from 'react'
import Chart from 'chart.js'

const HomePage = () => {
  const chartRef = useRef()

  const [forecast, setForecast] = useState({})

  useEffect(() => {
    fetch('/forecast.json')
      .then((response) => response.json())
      .then((json) => setForecast(json))
  }, [])

  useEffect(() => {
    new Chart(chartRef.current.getContext('2d'), {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'March'],
        datasets: [
          {
            label: 'High',
            data: [86, 67, 91],
          },
          {
            label: 'Low',
            data: [45, 43, 55],
          },
        ],
      },
    })
  }, [forecast])

  return <canvas ref={chartRef} />
}

export default HomePage
```

![image](https://user-images.githubusercontent.com/300/80657460-7beaab80-8a38-11ea-886d-17040ef8573c.png)

If that looks good then all that's left is to transform the weather data JSON into the format that Chart.js wants. Here's the final `HomePage` including a couple of functions to transform our data and display the dates properly:

```jsx
import { useState, useEffect, useRef } from 'react'
import Chart from 'chart.js'

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const getDates = (forecast) => {
  return forecast.list.map((entry) => {
    const date = new Date(0)
    date.setUTCSeconds(entry.dt)
    return `${MONTHS[date.getMonth()]} ${date.getDate()}`
  })
}

const getTemps = (forecast) => {
  return [
    {
      label: 'High',
      data: forecast.list.map((entry) => kelvinToFahrenheit(entry.temp.max)),
      borderColor: 'red',
      backgroundColor: 'transparent',
    },
    {
      label: 'Low',
      data: forecast.list.map((entry) => kelvinToFahrenheit(entry.temp.min)),
      borderColor: 'blue',
      backgroundColor: 'transparent',
    },
  ]
}

const kelvinToFahrenheit = (temp) => {
  return ((temp - 273.15) * 9) / 5 + 32
}

const HomePage = () => {
  const chartRef = useRef()

  const [forecast, setForecast] = useState(null)

  useEffect(() => {
    fetch('/forecast.json')
      .then((response) => response.json())
      .then((json) => setForecast(json))
  }, [])

  useEffect(() => {
    if (forecast) {
      new Chart(chartRef.current.getContext('2d'), {
        type: 'line',
        data: {
          labels: getDates(forecast),
          datasets: getTemps(forecast),
        },
      })
    }
  }, [forecast])

  return <canvas ref={chartRef} />
}

export default HomePage
```

If you got all of that right then you should see:

![Chart screenshot](https://user-images.githubusercontent.com/300/80656934-32e62780-8a37-11ea-963e-0b227d7fe1df.png)

All that's left is to deploy it to the world!

## Wrapping Up

Although we think Redwood will make app developers' lives easier when they need to talk to a database or third party API, it can be used with static sites and even hybrid sites like this when you want to digest and display data, but from a static file at your own URL.
