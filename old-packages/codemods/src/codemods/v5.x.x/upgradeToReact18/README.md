# Upgrade to React 18

React 18 doesn't handle hydration errors the same way 17 did. It's very strict, so we have to be very careful about the server HTML we send to the browser to be hydrated.

In v5, we changed the default `index.html` file a bit—we removed `prerenderPlaceholder`:

```diff
 <!DOCTYPE html>
 <html lang="en">

 <head>
   <meta charset="UTF-8" />
   <meta name="viewport" content="width=device-width, initial-scale=1.0" />
   <link rel="icon" type="image/png" href="/favicon.png" />
 </head>

 <body>
   <div id="redwood-app">
-    <!-- Please keep the line below for prerender support. -->
-    <%= prerenderPlaceholder %>
   </div>
 </body>

 </html>
```

This codemod removes that templating syntax from a user's `index.html` file, and warns about other children in the react root.
