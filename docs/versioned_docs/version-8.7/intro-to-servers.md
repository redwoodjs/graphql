---
description: How to get started connecting to and deploying to a real server
---

# Introduction to Servers

If you're looking at deploying to a real, physical server using something like the [Baremetal](/docs/deploy/baremetal) deploy option, you're going to need to get familiar with connecting to remote servers. On \*nix-based systems (but also Windows after installing something like Powershell) this is handled by the [SSH](https://en.wikipedia.org/wiki/Secure_Shell) utility. In this doc we'll learn about the various strategies that SSH can use to connect:

- Username & password
- Private key
- Public key

## Terminology

Let's define a few terms so we're on the same page going forward:

- SSH - Secure Shell Protocol (where'd the P go in the acronym?) is the protocol used by the `ssh` command line utility we'll be using throughout this doc
- `ssh` - when shown in code font like this it's referring to the actual command line utility, rather than the all-encompassing "SSH" concept
- `ssh-agent` - another utility that keeps track of public and private keys and makes them available for use by the `ssh` utility

## First Connect

Before we can do anything else, we want to make sure that we can remotely connect to our server via SSH manually, as \*nix folks have been doing for hundreds of years using SSH. Depending on how the server is configured, you'll connect with either a username and password, a private key known to the server, or a public key known to the server. We'll look at each one below.

A requirement of all of these authentication methods is that you know the username of the account you're connecting to. You'll need to get this from your hosting/cloud provider, and it could be pretty different depending on who your host is:

- If you use AWS and create an EC2 instance from an Ubuntu image, the user will be `ubuntu`
- If you use Amazon's own Linux image, it'll be `ec2user`
- If you create a Digital Ocean Droplet the user will be `root`

Et cetera. Whatever it is, you'll need to know that before connecting.

But first, a note about a yes/no prompt you'll see the first time using any of these connection methods...

## Fingerprint Prompt

Using any of the auth methods below will lead to the following prompt the first time you connect, and it's because you've never connected to that server before:

```
The authenticity of host '192.168.0.122 (192.168.0.122)' can't be established.
ED25519 key fingerprint is SHA256:FHQDzxsqA68c+BhLPUkyN8aAVrznDtekhPg/99JXk8Q.
This key is not known by any other names
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

This is a quick security check making sure that you're actually connecting to the computer that you think you are. You can be reasonably sure that it is, so just type "yes". You'll get a note letting you know that it's been added to the list of known hosts (and you won't be prompted when connecting to this server again):

```
Warning: Permanently added '192.168.0.122' (ED25519) to the list of known hosts.
```

You can see a list of all known servers by looking in this file:

```
~/.ssh/known_hosts
```

:::info Reusing IP addresses

If you're connecting to cloud-based servers, turning them on and off, and potentially reusing IP addresses, you'll get an error message the next time you try to connect to that IP (because the signature of the server itself is now different than what's recorded in `known_hosts`. Find that line and delete it from `~/.ssh/known_hosts` and you'll be able to connect again.

:::

Once you're past that prompt you'll then either be prompted for your password, or logged in automatically (when using a private or public key). Let's look at each one in detail.

:::warning Baremetal First Deploy Woes?

If you're having trouble deploying to your server with Baremetal, and you've never connected to your server manually via SSH, this could be why: Baremetal provides no interactive prompt to accept this server fingerprint. You need to connect manually at least once before Baremetal can connect.

:::

### Username/Password

Using username/password auth is pretty straight forward, just denote the user and server you want to connect to, either by its domain name or IP address. You will have created the password at the time you started your server, or maybe the host generated a random one.

```
ssh user@server.com
```

As a real example, here's how you would connect to a Digital Ocean Droplet. The user is `root` and the IP is `192.168.0.122`:

```
ssh root@192.168.0.122
```

You will be prompted to enter the server's password, and your keystrokes are hidden which for some reason makes typing a password exponentially harder:

```
root@192.168.0.122's password:
```

You'll get three tries to get the password correct.

Whether or not you connected successfully, skip ahead to the [Connected](#connected) section.

### Private Key

Some providers, like AWS, will give you a private key at the time the server is created, rather than a password. This file usually ends in `.pem`. Make sure you know where you put this file on your computer because, for now, it's the only way you'll be able to connect to your server. If you lose it, you'll need to terminate that instance and start a new one. I generally put them in the `~/.ssh` folder to keep all SSH-related stuff together, usually in a subdirectory. (I also move this directory to iCloud and then create a symlink back to `~/.ssh` so that it's synchronized across all of my systems.)

:::info More About Public/Private Keypairs

Learn more about [public/private key authentication](https://www.ssh.com/academy/ssh/public-key-authentication). But the gist is that you create two keys, one public and one private. Either one can encrypt a document, but, only the private key can _decrypt_ it. This means that anyone can have the public key and it can be freely distrubted (thus the "public" name), and the owner of the private key can always verify that it was encrypted using the related public key. A related technique can happen in reverse: the private key can be used to create a signature of a document, and the public key can be used to _verify_ that the signature was created by the matching private key. So you can get the original message, and after verifying the signature, trust that it was sent by the owner of the private key.

You can't _decrypt_ something with the public key that was encrypted with the private key, however. That would defeat the purpose of sharing the public key: anyone could read your message! If you need two-way encryption of messages then both parties could share their public keys and each would encrypt using the other party's public key.

:::

If you try connecting using that private key now, you'll most likely get a big scary message:

```
ssh -i ~/.ssh/keyname.pem ubuntu@192.168.0.122

@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
Permissions 0666 for '/Users/rob/.ssh/shared/algostake.pem' are too open.
It is required that your private key files are NOT accessible by others.
This private key will be ignored.
```

This is because files downloaded from the internet are given permissions that make them readable by anyone on the system. SSH doesn't like this. It wants you, and only you, to have access to this file. So we need to make it readable and writeable by only your user.

Permission changes are handled by the `chmod` command. The [octal version](https://chmodcommand.com/chmod-600/) of the permissions you want to set is the number `600` (which sets read/write permissions for the owner of file, and nothing for anyone else). To change the permission of the file:

```
chmod 600 ~/.ssh/keyname.pem
```

Where `keyname` is whatever the actual name of the file is. Once you do this you're ready to use it to connect. You still need the username and address of the server, but we're also going to set the `-i` flag which instructs SSH to use a private key at a given path:

```
ssh -i ~/.ssh/keyname.pem ubuntu@192.168.0.122
```

Skip ahead to the [Connected](#connected) section.

### Public Key

Some providers, like Digital Ocean, give you the opportunity to put your public key on the server automatically when it's created. This lets you avoid password and private key authentication completely, and is actually the preferred method of connecting via SSH that we'll end up with at [the end](#adding-your-ssh-public-key-to-the-server) of this guide!

If you don't really know what a public key is, where yours is at, or what it means to put it on the server, then skip ahead to the [Creating a Public Key](#creating-a-public-key) section.

You'll need your username and server address and that's it:

```
ssh ubuntu@192.168.0.122
```

If you have a public key, but your server doesn't let you pre-load it onto the server, you'll need to do it manually. See [Adding Your SSH Public Key to the Server](#adding-your-ssh-public-key-to-the-server) below.

## Connected

Whatever auth method you go with, you should now be connected! If you get an error message that looks like this:

```
ubuntu@192.168.0.122: Permission denied (publickey,password).
```

It could be one of several things:

- The username is wrong
- The password is wrong
- The public key your system is trying to connect with is not found on the server in its `~/.ssh/authorized_keys` file
- The private key you passed with the `-i` flag is not found on the server

If you run the command again with the `-v` flag (verbose) you'll see everything that SSH is trying when it tries to log in. There are lots of resources on the internet to help you [troubleshoot](https://docs.digitalocean.com/support/how-to-troubleshoot-ssh-connectivity-issues/).

Assuming you did not get an error, you should be logged in:

```
Welcome to Ubuntu 22.04 LTS (GNU/Linux 5.15.0-41-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/advantage

  System information as of Wed Aug  3 21:09:41 UTC 2022

  System load:  0.25439453125     Users logged in:       0
  Usage of /:   6.3% of 24.05GB   IPv4 address for eth0: 192.168.0.122
  Memory usage: 22%               IPv4 address for eth0: 10.48.0.5
  Swap usage:   0%                IPv4 address for eth1: 10.124.0.2
  Processes:    97

0 updates can be applied immediately.

The programs included with the Ubuntu system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Ubuntu comes with ABSOLUTELY NO WARRANTY, to the extent permitted by
applicable law.

root@remote-server:~#
```

This is the welcome message on an Ubuntu machine, yours may be different.

The last line is actually your prompt where you can start typing commands.

## Disconnecting

Disconnecting from the server is just a simple `exit` command. You can also just close your terminal window and the connection will be terminated:

```bash
root@remote-server:~# exit

Connection to 192.168.0.122 closed.
```

## Simplifying Access

Having to type your username or include a private key each time is not fun. Luckily SSH uses public/private key cryptography, and can verify your identity using your public key. You've probably uploaded your public key to GitHub in the **Settings > SSH and GPG keys** section. We'll do something similar here: put our local machine's public key on the server so that it knows it's us when we connect, and skip the password.

:::info

If you're already using [public key auth](#public-key) then you can probably skip this section—you're already doing it!

:::

You can have multiple public keys from multiple development machines on the server so you can connect from multiple computers. This comes in very handy when working on a team: when someone leaves you just remove their public key from the server. Contrast this with password authentication, where you either need to share the password to a single deploy user to all of your teammates, and then change the password when someone leaves, or give everyone a copy of the server's private key and change _that_ every time someone leaves. Just adding their public keys is much simpler to manage.

### Public/Private Keypairs

You may already have a public/private keypair! Check in `~/.ssh` and look for two files with the same name before the extension, one with `.pub` on the end (`id_ed25519` and `id_ed25519.pub`, for example). If you don't remember actually putting these files in the directory, then they were probably generated by a program like `ssh-keygen`, and SSH is already using them!

To see which of your keys SSH is already aware of, you can run this command to list them:

```
ssh-add -L
```

You should get zero or more lines containing public SSH keys, something like this:

```
ssh-ed25519 AAAAB3NzaC1yc2EAAAADAQAB<REDACTED>CU90x/khqD1sDW= rob@computer.local
```

If I compare that to the content of my `~/.ssh/id_ed25519.pub` file I can see that they match! Great, so SSH is already using our public key when it tries to connect. But what if you don't have a public/private keypair?

### Generating a Public/Private Keypair

There's a simple command to generate a new keypair:

```
ssh-keygen -t ed25519
```

This tells the program to generate a key using the ED25519 algorithm. There are [many algorithms](https://goteleport.com/blog/comparing-ssh-keys/) available, but not all of them are supported everywhere. The linked article goes into depth into the various algorithms and their pros and cons.

You will be prompted for a couple of questions:

```
Generating public/private ed25519 key pair.
Enter file in which to save the key (/Users/rob/.ssh/id_ed25519):
Enter passphrase (empty for no passphrase):
Enter same passphrase again:
```

If you don't have any keys, go ahead and use the default name `id_ed25519` by just hitting ENTER.

A Passphrase is an additional line of security on your key. However, it also adds some inconvenience around using your public key: you'll need to enter the passpharse each time your private key is accessed. Which is great for security, but kind of defeats the purpose of sharing your public key with the server to make access easier. As long as you protect your private key, you shouldn't need to worry about adding a passphrase. Press ENTER (twice) to create your keypair without a passphrase.

```
Your identification has been saved in id_ed25519
Your public key has been saved in id_ed25519.pub
The key fingerprint is:
SHA256:6Qg7RQRGp1AtfVIOucEt1HtZWkYMU1LZYBVwBsXwTWQ rob@computer.local
The key's randomart image is:
+--[ED25519 256]--+
| .B&@O+   .E  +==|
|  o=*= .** . o .o|
|  .   o   . . . .|
|    .o   o . o ..|
|    o . A * +   .|
|     = + = +     |
|    o . * .      |
|     . o         |
|                 |
+----[SHA256]-----+
```

:::info What's this randomart thing?

From this [Super User answer](https://superuser.com/a/22541):

> Validation is normally done by a comparison of meaningless strings (i.e. the hexadecimal representation of the key fingerprint), which humans are pretty slow and inaccurate at comparing. Randomart replaces this with structured images that are faster and easier to compare.

I suppose the idea is that if humans ever needed to compare public keys they could use the randomart version and know pretty quickly whether they're the same (instead of comparing a bunch of random number and letters by eye!)

:::

### Adding to ssh-agent

Our key exists but does SSH know to use it yet? Let's ask `ssh-agent` (the tool that manages keys and makes them available to the actual `ssh` process):

```
ssh-add -L
```

Do you see your new public key listed? If not, we just have to let `ssh-agent` know where it is and to start using it (note that you give the path to the private key):

```
ssh-add ~/.ssh/id_ed25519
```

Now running `ssh-add -L` should list our key.

:::info Missing key after computer restart

I've had cases where my key was unknown to `ssh-agent` after a computer restart. I added the following to the `~/.zshrc` file on my computer (not the server) so that the key is added every time I start a new terminal session:

```
ssh-add ~/.ssh/id_ed25519
```

:::

### Adding Your SSH Public Key to the Server

So SSH is now presenting the key to the server, but the server doesn't know what to do with it. We'll now copy our _public_ key to the server so that it allows connections from it. Write your public key to the terminal so that you can copy it:

```
cat ~/.ssh/id_ed25519.pub
```

:::info

On MacOS you can copy the key into your clipboard with this two-part command:

```
cat ~/.ssh/id_ed25519.pub | pbcopy
```

:::

Now, connect to the server with ssh as usual (using your username/password or private key) and then open up the `~/.ssh/authorized_keys` file for editing. The `nano` editor is usually built in and is simple to use, but `vi` is another choice (if you can figure out how to exit):

```
nano ~/.ssh/authorized_keys
```

Now just paste your key into this file on a new line. It helps to add a comment above so you know which computer this key is from, maybe with the person's name and the hostname of their system. As you upgrade computers or give coworkers access to this machine you'll quickly lose track of which keys are which if you don't label them:

```
# Rob Cameron (optimus-prime)
ssh-ed25519 AAAAB3NzaC1yc2EAAAADAQAB<REDACTED>CU90x/khqD1sDW= rob@computer.local
```

Save the file and exit. Now, disconnect from the SSH session with `exit` and reconnect, but this time you shouldn't need a password or private key (if you were using `-i` you can leave that off) and simply connect with:

```
ssh root@192.168.0.122
```

And you should be in!

## SSH Agent Forwarding

When connecting to a remote server, it would be nice if you could also SSH into other machines and have them identify you as _you_, on your personal computer, not as the server itself. By default this doesn't happen: making an SSH connection from your remote server uses the credentials on the server itself, meaning you'd have to go through all of the steps above to now treat the remote server as the client as whatever server _that_ server wants to connect to as the host, allowing you to connect with your public key. Ugh.

Luckily SSH has a mechanism that supports this: SSH Agent Forwarding.

This is most useful when trying to deploy a codebase from GitHub to your remote server: you're already connected to the remote server as you, and you're already authorized to connect to GitHub, so just use those credentials. You can verify if this is already working for you:

```
ssh -T git@github.com
```

If you get a message like this:

```
Hi cannikin! You've successfully authenticated, but GitHub does not provide shell access.
Connection to github.com closed.
```

Then agent forwarding is already enabled! GitHub recognized you as your username and gave you access. The remote server forwarded on your public key (the same one that was used to connect to your remote server) and everything just worked.

If instead you see this message:

```
git@github.com: Permission denied (publickey).
```

Then agent forwarding is not enabled. In this case we recommend this excellent guide from GitHub which walks you through enabling it: https://docs.github.com/en/developers/overview/using-ssh-agent-forwarding

## Deploy Keys

You may not want to use your own personal SSH keys during deploy time. One con to Agent Forwarding is that it requires that you personally (or a deploy system acting on your behalf) SSH into a machine to perform deploys, rather than letting a CI/CD system do them. Another is security: presumably your SSH keys allow full access to your repos, which is more than the read-only access needed for a deploy.

For these reasons you may want to consider using **deploy keys**. The idea is that you generate a public/private keypair that's unique to the server(s), and then let GitHub know about the public key. Now the server(s) can connect to GitHub and clone your codebase without you being involved. And you can lock down access to that key to a single repo with read-only access.

GitHub has a great guide for adding deploy keys to your account: https://docs.github.com/en/developers/overview/managing-deploy-keys#deploy-keys

## Customizing the Prompt

When deploying an app to production it can be very helpful to get a reminder of what server you're connected to, rather that seeing an IP address or random hostname at the prompt:

```
root@remote-server:~#
# or
user@192.168.0.122
```

Is that production? Staging? Which server in the cluster? Luckily you can customize this prompt pretty easily. I like to use the app name, the environment, an a simple integer of which server ID (if its in a cluster). So if my app is called "ruby" and it's the first server in the production environment cluster, I like to see my prompt as:

```
root@ruby-prod1:~#
```

This prompt is usually specified in one of these files:

```
~/.bashrc
~/.bash_profile
~/.zshrc
~/.zprofile
```

If you you use a shell other than `bash` or `zsh` the files are going to be named differently, but the idea is the same. Open the file in `nano` or `vi` and look for a line that starts with `PS1=` (you may see a couple of lines like this):

```bash
if [ "$color_prompt" = yes ]; then
  PS1='${debian_chroot:+($debian_chroot)}\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w \$\[\033[00m\] '
else
  PS1='${debian_chroot:+($debian_chroot)}\u@\h:\w\$ '
fi
```

In the config snippet above, the first `PS1` is used for color prompts and the second is for black and white. You'll want to change them both.

Within all of that gobledy gook you should see a few special escape characters: `\u`, `\h` and `\w`. These are the **user**, **hostname** and **working directory**. You may have all or only some of these present. The rest of the characters, like `[\033[00m\]` are color codes, which we can ignore for now.

For our simple case, just replace the `\h` with the string we want to show for the hostname:

```bash
if [ "$color_prompt" = yes ]; then
    PS1='${debian_chroot:+($debian_chroot)}\[\033[01;32m\]\u@ruby-prod1\[\033[00m\]:\[\033[01;34m\]\w \$\[\033[00m\] '
else
    PS1='${debian_chroot:+($debian_chroot)}\u@ruby-prod1:\w\$
fi
```

Now save the file, and run `source` to load up the variables into the current session:

```
source ~/.bashrc
```

You should see your prompt change to and you new custom hostname! Now whenever you connect to your server you'll be sure not to run `rm -rf *` in the wrong environment.

If you want to get real fancy with your prompt, there are some [PS1 generators](hhttps://ezprompt.net) out there that let you create the string containing all kinds of fancy stuff, and easily customize the colors.

## Aliases for Even Easier Connections

Seeing `ruby-prod1` helps keep track of which server we're on, but wouldn't it be great if you could just type that as a command and connect automatically? You can!

On your local computer's `.zshrc`, `.bash_profile` whichever file, add a line like the following:

```
alias ruby-prod1='ssh root@192.168.0.122'
```

Then run `source ~/.zshrc` to execute it. Now you should be able to connect by just using the name of the server, and skip the SSH command altogether:

```
ruby-prod1
```

It doesn't get much easier than that!

## What's Next?

You should now be ready to get to the next step(s) using the [Baremetal](/docs/deploy/baremetal) deploy! Baremetal does the same thing you're doing manually (SSHing into the remote server and running commands), so if you can connect to your server manually then Baremetal should be able to as well.
