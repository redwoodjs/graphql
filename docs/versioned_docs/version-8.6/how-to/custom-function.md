# Custom Function

You may not have noticed, but when you're making GraphQL calls, you're actually calling a [Function](https://docs.netlify.com/functions/overview/) (not to be confused with a Javascript `function`) on the API side. Capital-F Functions are meant to be deployed to serverless providers like AWS Lambda. (We're using Netlify's nomenclature when we call them Functions.)

<!-- turn this into an aside where you can expand on it, maybe. > We're using Netlify's nomenclature when we call them Functions. -->

<!-- as a... could be reworded -->

Did you know you can create your own Functions that do whatever you want? Normally we recommend that if you have custom behavior, even if it's unrelated to the database, you make it available as a GraphQL field so that your entire application has one, unified API interface. But rules were meant to be broken!

How about a custom Function that returns the timestamp from the server?

## Creating a Function

Step one is to actually create the custom Function. Naturally, we have a generator for that. Let's call our custom Function "serverTime":

```bash
yarn rw generate function serverTime
```

That creates a stub you can test out right away. Make sure your dev server is running (`yarn rw dev`), then point your browser to `http://localhost:8910/.redwood/functions/serverTime`.

![serverTime Function output](https://user-images.githubusercontent.com/32992335/107839683-609c2300-6d62-11eb-93d7-ff9c1bfb0ff2.png)

### Interlude: `apiUrl`

The `.redwood/functions` bit in the link you pointed your browser to is what's called the `apiUrl`. You can configure it in your `redwood.toml`:

```toml {5}
# redwood.toml

[web]
  port = 8910
  apiUrl = "/.redwood/functions"
```

After you setup a deploy (via `yarn rw setup deploy <provider>`), it'll change to something more appropriate, like `.netlify/functions` in Netlify's case.

<!-- https://community.redwoodjs.com/t/getting-cors-error-while-calling-a-lambda-function/186 -->
<!-- link to something; maybe even  -->

Why do we need `apiUrl`? Well, when you go to deploy, your serverless functions won't be in the same place as your app; they'll be somewhere else. Sending requests to the `apiUrl` let's your provider handle the hard work of figuring out where they actually are, and making sure that your app can actually access them.

If you were to try and fetch `http://localhost:8911/serverTime` from the web side, you'd run into an error you'll get to know quite well: CORS.

#### Interludeception: CORS

Time for an interlude within an interlude, because that's how you'll always feel when it comes to CORS: you were doing something else, and then `No 'Access-Control-Allow-Origin' header is present on the requested resource`. Now you're doing CORS.

If you don't know much about CORS, it's something you probably should know some about at some point. CORS stands for Cross Origin Resource Sharing; in a nutshell, by default, browsers aren't allowed to access resources outside their own domain. So, requests from `localhost:8910` can only access resources at `localhost:8910`. Since all your serverless functions are at `localhost:8911`, doing something like

```javascript
// the `http://` is important!
const serverTime = await fetch('http://localhost:8911/serverTime')
```

from the web side would give you an error like:

```
Access to fetch at 'http://localhost:8911/serverTime' from origin 'http://localhost:8910' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource. If an opaque response serves your needs, set the request's mode to 'no-cors' to fetch the resource with CORS disabled.
```

We could set the headers for `serverTime` to allow requests from any origin... but maybe a better idea would be to never request `8911` from `8910` in the first place. Hence the `apiUrl`! We're making a request to `8910/.redwood/functions/serverTime`&mdash;still the same domain&mdash;but [Vite](https://github.com/redwoodjs/redwood/blob/main/packages/vite/src/index.ts#L119) proxies them to `localhost:8911/serverTime` for us. Since we can access the `apiUrl` on the frontend via [environment variables](../environment-variables#accessing-api-urls), we can now change the above fetch to work in development as well as in production:

```javascript
const serverTime = await fetch(globalThis.RWJS_API_URL + '/serverTime')
```

> Note: If you want to use [Redwood Authentication](https://docs.redwoodjs.com/docs/serverless-functions/#serverless-functions-with-redwood-user-authentication) on your custom function, your fetch needs to send credentials in a cookie via `fetch(globalThis.RWJS_API_URL + '/serverTime', { credentials: 'include' })`. If you are using dbAuth you might need to add the [Domain](https://docs.redwoodjs.com/docs/auth/dbauth/#cookie-domain) property to your cookie configuration.

## Getting the Time

Ok&mdash;back to our custom Function. Let's get the current time and return it in the body of our handler:

```javascript {4} title="api/src/functions/serverTime.js"
export const handler = async (event, context) => {
  return {
    statusCode: 200,
    body: new Date(),
  }
}
```

![Time output screenshot](https://user-images.githubusercontent.com/300/81352089-87faec80-907a-11ea-96f7-bb05345a86d7.png)

> Here we're using a [Chrome extension](https://chrome.google.com/webstore/detail/json-viewer/gbmdgpbipfallnflgajpaliibnhdgobh) that prettifies data that could be identified as JSON. In this case, the date is wrapped in quotes, which is valid JSON, so the extension kicks in.

How about we make sure the response is a JSON object:

```javascript {4-5} title="api/src/functions/serverTime.js"
export const handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json ' },
    body: JSON.stringify({ time: new Date() }),
  }
}
```

![JSON time output screenshot](https://user-images.githubusercontent.com/300/81352131-9fd27080-907a-11ea-8db0-6308a4c48b5f.png)

> Note that Node.js doesn't have ES module support (yet), but we use Babel to transpile during the build phase so you can still use `import` syntax for external packages in your Functions.

### Bonus: Filtering by Request Method

Since you are most definitely an elite hacker, you probably noticed that our new endpoint is available via all HTTP methods: **GET**, **POST**, **PATCH**, etc. In the spirit of [REST](https://www.codecademy.com/articles/what-is-rest), this endpoint should really only be accessible via a **GET**.

> Again, because you're an elite hacker you definitely said "excuse me, actually this endpoint should respond to **HEAD** and **OPTIONS** methods as well." Okay fine, but this is meant to be a quick introduction, cut us some slack! Why don't you write a recipe for us and open a PR, smartypants??

Inspecting the `event` argument being sent to `handler` gets us all kinds of juicy details on this request:

```javascript {2} title="api/src/functions/serverTime.js"
export const handler = async (event, context) => {
  console.log(event)
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json ' },
    body: JSON.stringify({ time: new Date() }),
  }
}
```

Take a look in the terminal window where you're running `yarn rw dev` to see the output:

```json
{
  "httpMethod": "GET",
  "headers": {
    "host": "localhost:8911",
    "connection": "keep-alive",
    "cache-control": "max-age=0",
    "dnt": "1",
    "upgrade-insecure-requests": "1",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.129 Safari/537.36",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "sec-fetch-site": "none",
    "sec-fetch-mode": "navigate",
    "sec-fetch-user": "?1",
    "sec-fetch-dest": "document",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "en-US,en;q=0.9"
  },
  "path": "/serverTime",
  "queryStringParameters": {},
  "body": "",
  "isBase64Encoded": false
}
```

That first entry, `httpMethod`, is what we want. Let's check the method and return a 404 if it isn't a **GET**:

```javascript {2-4} title="api/src/functions/serverTime.js"
export const handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 404 }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json ' },
    body: JSON.stringify({ time: new Date() }),
  }
}
```

It's tough to test other HTTP methods in the browser without installing an extension, but we can do it from the command line with curl:

```bash
$ curl -XPOST http://localhost:8911/serverTime -I
```

You should see:

```bash
HTTP/1.1 404 Not Found
X-Powered-By: Express
Date: Thu, 07 May 2020 22:33:55 GMT
Connection: keep-alive
Content-Length: 0
```

And just to be sure, let's make that same request with a **GET** (curl's default method):

```bash
$ curl http://localhost:8911/serverTime
{"time":"2020-05-07T22:36:12.973Z"}
```

> If you leave the `-I` flag on then curl will default to a HEAD request! Okay fine, you were right elite hacker!

### Super Bonus: Callback Hell

Redwood uses the async/await version of Function handlers, but you can also use the callback version. In that case your Function would look something like:

```javascript {1,3,6,10} title="api/src/functions/serverTime.js"
export const handler = (event, context, callback) => {
  if (event.httpMethod !== 'GET') {
    callback(null, { statusCode: 404 })
  }

  callback(null, {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json ' },
    body: JSON.stringify({ time: new Date() }),
  })
}
```

Yeah, kinda gross. What's with that `null` as the first parameter? That's used if your handler needs to return an error. More on callback-based handlers can be found in [Netlify's docs](https://docs.netlify.com/functions/build-with-javascript/#format).

The callback syntax may not be _too_ bad for this simple example. But, if you find yourself dealing with Promises inside your handler, and you choose to go use callback syntax, you may want to lie down and rethink the life choices that brought you to this moment. If you still want to use callbacks you had better hope that time travel is invented by the time this code goes into production, so you can go back in time and prevent yourself from ruining your own life. You will, of course, fail because you already chose to use callbacks the first time so you must have been unsuccessful in stopping yourself when you went back.

Trust us, it's probably best to just stick with async/await instead of tampering with spacetime.

### Conclusion

We hope this gave you enough info to get started with custom Functions, and that you learned a little something about the futility of trying to change the past. Now go out and build something awesome!
