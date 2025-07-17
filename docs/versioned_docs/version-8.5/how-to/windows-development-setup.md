# Windows Development Setup

This guide provides a simple setup to start developing a RedwoodJS project on Windows. Many setup options exist, but this aims to make getting started as easy as possible. This is the recommended setup unless you have experience with some other shell, like PowerShell.

> If you're interested in using the Windows Subsystem for Linux instead, there is a [community guide for that](https://community.redwoodjs.com/t/windows-subsystem-for-linux-setup/2439).

### Git Bash

Download the latest release of [**Git for Windows**](https://git-scm.com/download/win) and install it.
When installing Git, you can add the icon on the Desktop and add Git Bash profile to Windows Terminal if you use it, but it is optional.

![1-git_components.png](https://user-images.githubusercontent.com/18013532/146685298-b12ed1a5-fe99-4286-ab12-69cf0a7be139.png)

Next, set VS Code as Git default editor (or pick any other editor you're comfortable with).

![2-git_editor.png](https://user-images.githubusercontent.com/18013532/146685299-0e067554-a5a8-46b9-91ac-ffcd6f738b80.png)

For all other steps, we recommended keeping the default choices.

### Node.js environment (and npm)

We recommend you install the latest `nvm-setup.zip` of [**nvm-windows**](https://github.com/coreybutler/nvm-windows/releases) to manage multiple version installations of Node.js. When the installation of nvm is complete, run Git Bash as administrator to install Node with npm.

![3-git_run_as_admin.png](https://user-images.githubusercontent.com/18013532/146685300-1762a00a-26cb-4f8b-b480-c6aba4e26b89.png)

Redwood uses the LTS version of Node. To install, run the following commands inside the terminal:

```bash
$ nvm install lts --latest-npm
// installs latest LTS and npm
e.g. 16.13.1 for the following examples
$ nvm use 16.13.1
```

### Yarn

Now you have both Node and npm installed! Redwood also uses yarn, which you can now install using npm:

```bash
npm install -g yarn
```

_Example of Node.js, npm, and Yarn installation steps_

![4-install_yarn.png](https://user-images.githubusercontent.com/18013532/146685297-b361ebea-7229-4d8c-bc90-472773d06816.png)

## Congrats!

You now have everything ready to build your Redwood app.

Next, you should start the amazing [**Redwood Tutorial**](tutorial/chapter1/installation.md) to learn how to use the framework.

Or run `yarn create redwood-app myApp` to get started with a new project.

## Troubleshooting

### Beware case-insensitivity

On Windows Git Bash, `cd myapp` and `cd myApp` will select the same directory because Windows is case-insensitive. But make sure you type the original capitalization to avoid strange errors in your Redwood project.

### Microsoft Visual C++ Redistributable

If your machine doesn't have Microsoft Visual C++ Redistributable, then you need to install it from [here](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170#visual-studio-2015-2017-2019-and-2022).
