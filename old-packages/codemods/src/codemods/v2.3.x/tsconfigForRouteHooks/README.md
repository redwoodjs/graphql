# Modify TS Config For Route Hooks

Updates the `web/tsconfig.json` file to include a path alias for `$api`.

This allows you to import for example

```
import { db } from '$api/src/lib/db'
import { bazinga } from '$api/src/lib/bazinga'
```

Just like in scripts, in your \*.routeHooks.ts files. This feature was enabled as part of Cell prerendering and dynamic path prerendering.
