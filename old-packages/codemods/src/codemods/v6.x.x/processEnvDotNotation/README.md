# Process Env Dot Notation

Finds all cases where `process.env` is accessed via array notation (specifically string literals), and converts it to dot notation.

```diff
- process.env['BAZINGA']
+ process.env.BAZINGA
```

**NOTE** - this does not deal with dynamic access case. This is something users will need to do themselves
