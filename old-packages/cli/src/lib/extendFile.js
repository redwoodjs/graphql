import fs from 'fs-extra'

/**
 * Convenience function to check if a file includes a particular string.
 * @param {string} path File to read and search for str.
 * @param {string} str The value to search for.
 * @returns true if the file exists and the contents thereof include the given string, else false.
 */
export function fileIncludes(path, str) {
  return fs.existsSync(path) && fs.readFileSync(path).toString().includes(str)
}

/**
 * Inject code into the file at the given path.
 * Use of insertComponent assumes only one of (around|within) is used, and that the component
 * identified by (around|within) occurs exactly once in the file at the given path.
 * Imports are added after the last redwoodjs import.
 * moduleScopeLines are added after the last import.
 *
 * @param {string} path Path to JSX file to extend.
 * @param {Object} options Configure behavior
 * @param {Object} options.insertComponent Configure component-inserting behavior.
 * @param {Object} options.insertComponent.name Name of component to insert.
 * @param {Object|string} options.insertComponent.props Properties to pass to the inserted component.
 * @param {string} options.insertComponent.around Name of the component around which the new
 * component will be inserted. Mutually exclusive with insertComponent.within.
 * @param {string} options.insertComponent.within Name of the component within which the new
 * component will be inserted. Mutually exclusive with insertComponent.around.
 * @param {string} options.insertComponent.insertBefore Content to insert before the inserted
 * component.
 * @param {string} options.insertComponent.insertAfter Content to insert after the inserted
 * component.
 * @param {Array} options.imports Import declarations to inject after the last redwoodjs import.
 * @param {Array} options.moduleScopeLines Lines of code to inject after the last import statement.
 * @returns Nothing; writes changes directly into the file at the given path.
 */
export function extendJSXFile(
  path,
  {
    insertComponent: {
      name = undefined,
      props = undefined,
      around = undefined,
      within = undefined,
      insertBefore = undefined,
      insertAfter = undefined,
    },
    imports = [],
    moduleScopeLines = [],
  },
) {
  const content = fs.readFileSync(path).toString().split('\n')

  if (moduleScopeLines?.length) {
    content.splice(
      content.findLastIndex((l) => l.trimStart().startsWith('import')) + 1,
      0,
      '', // Empty string to add a newline when we .join('\n') below.
      ...moduleScopeLines,
    )
  }

  if (imports?.length) {
    content.splice(
      content.findLastIndex((l) => l.includes('@redwoodjs')) + 1,
      0,
      '', // Empty string to add a newline when we .join('\n') below.
      ...imports,
    )
  }

  if (name) {
    insertComponent(content, {
      component: name,
      props,
      around,
      within,
      insertBefore,
      insertAfter,
    })
  }

  fs.writeFileSync(path, content.filter((e) => e !== undefined).join('\n'))
}

/**
 * Inject lines of code into an array of lines to wrap the specified component in a new component tag.
 * Increases the indentation of newly-wrapped content by two spaces (one tab).
 *
 * @param {Array} content A JSX file split by newlines.
 * @param {String} component Name of the component to insert.
 * @param {String|Object} props Properties to pass to the new component.
 * @param {String} around Name of the component around which to insert the new component. Mutually
 * exclusive with within.
 * @param {String} within Name of the component within which to insert the new component. Mutually
 * exclusive with around.
 * @param {String} insertBefore Content to insert before the inserted component.
 * @param {String} insertAfter Content to insert after the inserted component.
 * @returns Nothing; modifies content in place.
 */
function insertComponent(
  content,
  { component, props, around, within, insertBefore, insertAfter },
) {
  if ((around && within) || !(around || within)) {
    throw new Error(
      'Exactly one of (around | within) must be defined. Choose one.',
    )
  }

  const target = around ?? within
  const findTagIndex = (regex) => content.findIndex((line) => regex.test(line))

  let open = findTagIndex(new RegExp(`([^\\S\r\n]*)<${target}\\s*(.*)\\s*>`))
  let close = findTagIndex(new RegExp(`([^\\S\r\n]*)<\/${target}>`)) + 1

  if (open === -1 || close === -1) {
    throw new Error(`Could not find tags for ${target}`)
  }

  if (within) {
    open++
    close--
  }

  // Assuming close line has same indent depth.
  const [, componentDepth] = content[open].match(/([^\S\r\n]*).*/)

  content.splice(
    open,
    close - open, // "Delete" the wrapped component contents. We put it back below.
    insertBefore && componentDepth + insertBefore,
    componentDepth + buildOpeningTag(component, props),
    // Increase indent of each now-nested tag by one tab (two spaces)
    ...content.slice(open, close).map((line) => '  ' + line),
    componentDepth + `</${component}>`,
    insertAfter && componentDepth + insertAfter,
  )
}

/**
 *
 * @param {string} componentName Name of the component to create a tag for.
 * @param {Object|string|undefined} props Properties object, or string, to pass to the tag.
 * @returns A string containing a valid JSX opening tag.
 */
function buildOpeningTag(componentName, props) {
  const propsString = (() => {
    switch (typeof props) {
      case 'undefined':
        return ''
      case 'object':
        return objectToComponentProps(props, { raw: true }).join(' ')
      case 'string':
        return props
      default:
        throw new Error(
          `Illegal argument passed for 'props'. Required: {Object | string | undefined}, got ${typeof props}`,
        )
    }
  })()

  const possibleSpace = propsString.length ? ' ' : ''
  return `<${componentName}${possibleSpace}${propsString}>`
}

/**
 * Transform an object to JSX props syntax
 *
 * @param {Record<string, any>} obj
 * @param {{exclude?: string[], raw?: boolean | string[]}} options
 * @returns {string[]}
 */
export function objectToComponentProps(
  obj,
  options = { exclude: [], raw: false },
) {
  const props = []

  const doRaw = (key) =>
    options.raw === true ||
    (Array.isArray(options.raw) && options.raw.includes(key))

  for (const [key, value] of Object.entries(obj)) {
    if (options.exclude && options.exclude.includes(key)) {
      continue
    }
    if (doRaw(key)) {
      props.push(`${key}={${value}}`)
    } else {
      props.push(`${key}="${value}"`)
    }
  }

  return props
}
