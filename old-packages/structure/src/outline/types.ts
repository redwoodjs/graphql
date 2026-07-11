export enum Icon {
  redwood = 'redwood',
  page = 'page',
  page_private = 'page_private',
  pages = 'pages',
  layouts = 'layouts',
  netlify = 'netlify',
  prisma = 'prisma',
  storybook = 'storybook',
  services = 'services',
  graphql = 'graphql',
  play = 'play',
  components = 'components',
  rw_cli = 'rw_cli',
  functions = 'functions',
  cells = 'cells',
  model = 'model',
}

export interface OutlineItem {
  /**
   * Label for the outline item.
   * This is the main text.
   */
  label: string
  /**
   * If label is not unique amongst siblings, key is used to disambiguate.
   * This is similar to ReactNode.key
   */
  key?: string
  /**
   * Secondary text.
   */
  description?: string

  tooltip?: string

  /**
   * - If present, this item will be rendered as a folder (with an expand button).
   * - If undefined, this item will be rendered as a leaf
   */
  children?(): Promise<OutlineItem[]>

  /**
   * Whether this outline item should be expanded by default.
   * This is only relevant if children() is defined
   */
  expanded?: boolean

  link?: OutlineLinkString
  /**
   * link to documentation (URL, webpage)
   */
  doc?: OutlineLinkString
  add?: OutlineLinkString

  icon?: Icon
}

/**
 * A link/action to execute when an outline item is clicked.
 * It can be:
 * - a file URL (with optional position hash)
 *   - ex: "file:///somefile.ts"
 *   - ex: "file:///Users/foo/bar/project/myfile.js#3:10"
 *   - the editor will open and focus on this document when the item is selected
 *   - note: a "file://" URL can only be associalted to ONE item in the outline
 *     (so vscode can do a reverse search).
 * - an HTTP URL
 *   - ex: "http://localhost:9999/foo/bar"
 *   - ex: "http://redwoodjs.com/"
 *   - the URL will open in the default browser when this item is selected
 * - a redwood CLI action
 *   - ex: "rw generate page"
 *   - note: the string must start with "rw"
 *   - the command will be executed when this item is selected
 * - an interactive redwood action
 *   - ex: "rw generate page..."
 *   - the string must start with end with "..." (this means interactive)
 *   - the interactive process will start when this item is selected
 *   - not all redwood commands are supported in interactive mode
 *   - see: https://github.com/redwoodjs/redwood/tree/main/packages/structure/src/interactive_cli
 */
type OutlineLinkString = string

export type OutlineItemJSON = Omit<OutlineItem, 'children'> & {
  children?: OutlineItemJSON[]
}

/**
 * this will recursively await all children and return a serializable representation
 * of the complete outline
 * @param item
 */
export async function outlineToJSON(
  item: OutlineItem,
): Promise<OutlineItemJSON> {
  if (!item.children) {
    return { ...item, children: undefined }
  }
  const cs = item.children ? await item.children() : []
  const css = await Promise.all(cs.map(outlineToJSON))
  return { ...item, children: css }
}
