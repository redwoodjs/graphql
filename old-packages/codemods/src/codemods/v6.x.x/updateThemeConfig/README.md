```
npx @redwoodjs/codemods@canary update-theme-config
```

# Update Theme Config

Modifies the config files specifically for mantine and chakra-ui to use ESM syntax to export the theme.

```diff
// This is common JS lets get rid of it!
- module.exports = {/**....your theme **/}
+ const theme = {/**....your theme **/}
+ export default theme
```
