# Using nvm

## What is nvm?

[nvm](https://github.com/nvm-sh/nvm) is a Node Version Manager. It's perfect for running multiple versions of Node.js on the same machine.

## Installing nvm

:::warning
If you've already installed Node.js on your machine, uninstall Node.js before installing nvm. This will prevent any conflicts between the Node.js and nvm.

### If you're on a Mac

You can uninstall by running the following command in your terminal:

```bash
brew uninstall --force node
```

Once that's finished, run the following command to remove unused folders and dependencies:

```bash
brew cleanup
```

### If you're on Windows

- Go to the start menu, search and go to **Settings**
- Click on the **Apps** section
- In the search box under **Apps & Features** section, search for **Nodejs**
- Click on **Nodejs** and click on **Uninstall**
- We recommend restarting your machine, even if you're not prompted to do so
  :::

### If you're on a Mac

You can install `nvm` using [Homebrew](https://brew.sh/):

```bash
brew install nvm
```

### If you're on Windows

Reference the [nvm-windows](https://github.com/coreybutler/nvm-windows) repo.

- Download the [latest installer](https://github.com/coreybutler/nvm-windows/releases) (nvm-setup.zip)
- Locate your zip file (should be in your downloads or wherever you've configured your downloads to be saved) and unzip/extract its contents
- Now, you should have a file called **nvm-setup.exe**. Double click on it to run the installer.
- Follow the instructions in the installer

:::info
We have a specific doc for [Windows Development Setup.](/docs/how-to/windows-development-setup)
:::

## How to use nvm

To confirm that `nvm` was installed correctly, run the following command in your terminal:

```bash
nvm --version
```

You should see the version number of `nvm` printed to your terminal.

### To install the latest version of Node.js

```bash
nvm install latest
```

### To install a specific version of Node.js

```bash
nvm install <version number>
```

To see all the versions of Node that you can install, run the following command:

```bash
nvm ls-remote
```

:::warning
You'll need to [install yarn](https://yarnpkg.com/getting-started/install) **for each version of Node that you install.**

[Corepack](https://nodejs.org/dist/latest/docs/api/corepack.html) is included with all Node.js >=16.10 installs, but you must opt-in. To enable it, run the following command:

```bash
corepack enable
```

We also have a doc specifically for [working with yarn](./using-yarn).
:::

### To use a specific version of Node.js

```bash
nvm use <version number>
```

:::info
Remember: [Redwood has specific Node.js version requirements.](../tutorial/chapter1/prerequisites.md#nodejs-and-yarn-versions)
:::

### To see all the versions of Node.js that you have installed

```bash
nvm ls
```

### To set the default version of Node.js

```bash
nvm alias default <<version number>>
```

### To uninstall a specific version of Node.js

```bash
nvm uninstall <<version number>>
```
