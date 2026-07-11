import enquirer from 'enquirer'

import type { VSCodeWindowMethods } from '../x/vscode'

export type UIPickItem = {
  label: string
  description?: string
  picked?: boolean
}

export function UIPickItem_normalize(item: UIPickItem | string): UIPickItem {
  return typeof item === 'string' ? { label: item } : item
}

export interface UI {
  info(msg: string): Promise<void>
  prompt(
    msg: string,
    opts?: { value?: string; valueSelection?: any; validateInput?: any },
  ): Promise<string | undefined>
  pickOne(
    items: (string | UIPickItem)[],
    msg: string,
  ): Promise<string | undefined>
  pickMany(
    items: (string | UIPickItem)[],
    msg: string,
  ): Promise<string[] | undefined>
  //confirm(msg: string): Promise<boolean | undefined>;
}

export class VSCodeWindowUI implements UI {
  constructor(private w: VSCodeWindowMethods) {}
  async info(msg: string): Promise<void> {
    await this.w.showInformationMessage(msg)
  }
  async prompt(msg: string, opts): Promise<string | undefined> {
    const opts2 = { ...opts, prompt: msg }
    return await this.w.showInputBox(opts2)
  }

  async pickOne(
    items: (string | UIPickItem)[],
    msg: string,
  ): Promise<string | undefined> {
    const items2 = items.map(UIPickItem_normalize)
    const res = await this.w.showQuickPick(items2, { placeHolder: msg })
    return res?.label
  }
  async pickMany(
    items: (string | UIPickItem)[],
    msg: string,
  ): Promise<string[] | undefined> {
    const items2 = items.map(UIPickItem_normalize)
    const res = await this.w.showQuickPick(items2, {
      placeHolder: msg,
      canPickMany: true,
    })
    return res?.map((r) => r.label)
  }
}

export class CLIUI implements UI {
  async info(msg: string): Promise<void> {
    console.log(msg)
  }
  async prompt(msg: string): Promise<string | undefined> {
    const res = await enquirer.prompt({
      type: 'input',
      name: 'x',
      message: msg,
    })
    return res['x']
  }
  async pickOne(
    items: (string | UIPickItem)[],
    msg: string,
  ): Promise<string | undefined> {
    const items2 = items.map(UIPickItem_normalize)
    const res = await enquirer.prompt({
      type: 'select',
      name: 'x',
      message: msg,
      choices: items2.map((i) => i.label),
    })
    return res['x']
  }
  async pickMany(
    items: (string | UIPickItem)[],
    msg: string,
  ): Promise<string[] | undefined> {
    const items2 = items.map(UIPickItem_normalize)
    const res = await enquirer.prompt({
      type: 'multiselect',
      name: 'x',
      message: msg,
      choices: items2.map((i) => i.label),
    })
    return res['x']
  }
}
