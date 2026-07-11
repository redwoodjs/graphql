# Merge Source Code

The contents of this directory are designed to enable the merging of Javascript source code using Babel.

## Usage

This library provides single entry point, `merge()`, which takes three arguments: the "base" source code as a string, the "extension" source code as a string, and a merge strategy. It returns a string, the result of merging the base and extension code. A merge strategy is an object with 1) an optional `identity` function, and 2) Any number of node-reducers, with names corresponding to Babel's AST node types.

`identity` is used to label AST nodes in both files. If two AST nodes have the same label, they will be merged by the corresponding node-reducer, if it exists in your strategy. `identity` takes a Babel NodePath and returns a string that identifies the given NodePath in a particular way. If `identity` is not defined for your strategy, `semanticIdentity` is used by default. It is explicitly named in the following examples for clarity.

Let's take a look at a sample invocation of `merge`.

```js
const mergedCode = merge(baseCode, extensionCode, {
  identity: semanticIdentity,
  ArrayExpression: (lhs, rhs) => { lhs.elements = [...lhs.elements, ...rhs.elements] }
  ObjectExpression: (lhs, rhs) => { lhs.properties = [...lhs.properties, ...rhs.properties] }
})
```

Here, the closures to the right-hand-side of `ArrayExpression` and `ObjectExpression` are node-reducers, discussed in greater detail below. `strategy.js` also provides some convenience functions, which provide consistent names for strategies, while defining node-specific implementations as required.

```js
import { concat } from 'merge/strategy'

const mergedCode = merge(baseCode, extensionCode, {
  identity: semanticIdentity,
  ArrayExpression: concat // Equivalent to `(lhs, rhs) => { lhs.elements = [...lhs.elements, ...rhs.elements] }`
  ObjectExpression: concat // Equivalent to `(lhs, rhs) => { lhs.properties = [...lhs.properties, ...rhs.properties] }`
})
```

Often, you'll want to concatenate two expressions, skipping any duplicates. To do this, you can use `concatUnique`, and provide an equality function for your node type.

```js
import { concat, concatUnique } from 'merge/strategy'

const objectPropertyEquality = (lhs, rhs) => lhs.key.name === rhs.key.name

const mergedCode = merge(baseCode, extensionCode, {
  identity: semanticIdentity,
  ArrayExpression: concat
  ObjectExpression: concatUnique(objectPropertyEquality)
})
```

You can find a complete summary of all available merge strategy convenience functions below, in **Merge Strategies**

## Design Summary

Broadly speaking, `merge()` requires the caller to answer two questions about the merge (but provides a default for the first)

1. How do we choose which AST nodes to merge?
2. How do we merge AST nodes?

### Semantic Identity

For 1, the default approach is with _semantic identity_, defined in `semantics.js`. A semantic identity is a position-independent pseudo-unique identifier for an AST node. In English, these are just identifiers for code you'd intuitively call "the same" across files. An example can help illustrate:

```js
// a.js
const x = { foo: 'foo' }
export const y = [1, 2, 3, 4, 5]
// b.js
export const y = [5, 6, 7, 8, 9]
const x = { bar: 'bar' }
```

Both `a.js` and `b.js` define the same symbols, but in different orders. The semantic identity of `x` and `y` are the same across both files, because they share:

1. The same scope (module scope)
2. The same name
3. The same initializer type (object and array, respectively).
4. The same exported-ness.

Semantic identity also applies at arbitrary scope depth, and can look "inside" functions, objects, and arrays.

```js
// c.js
const x = { foo: { bar: 'bar' } }
const y = (a) => {
  const z = [1, 2, 3]
  return z.contains(a)
}
// d.js
const y = (a) => {
  const z = [4, 5, 6]
  return z.contains(a)
}
const x = { foo: { baz: 'baz' } }
```

In these examples, `x`, `z` and the `ObjectExpression` to the right side of `foo:` have the same semantic identity. Intuitively, two nodes have the same semantic identity if you can trace the "path" from their scope up to the module scope, and find identical identifiers at each parent scope. Here are some counterexamples to help illustrate:

```js
// e.js
const e = (a) => {
  const z = [1, 2, 3]
  return z.contains(a)
}
// f.js
const f = (a) => {
  // This `z` does not have the same semantic identity as e.z,
  // because the names e and f differ.
  const z = [1, 2, 3]
  return z.contains(a)
}
```

```js
// g.js
const g = {
  foo: {
    bar: {
      baz: 'baz',
    },
  },
}
// g2.js
const g = {
  foo: {
    bar: {
      // This object's ID is the same as g.foo.bar above,
      blep: 'baz', // But this string's ID is not; g.foo.bar.blep vs. g.foo.bar.baz.
    },
  },
}
```

The goal of semantic identifiers (roughly) is to produce a unique identifier for an AST node, such that iff two AST nodes with the same identifier appeared in the same file, a naming collision would occur. This has one important exception: import statements. Import statements are difficult to uniquely identify because the following is legal:

```js
import { foo } from 'src'
import { bar } from 'src'
```

We have two choices here. Either we consider these semantically equivalent by comparing their source (`src`), or consider them semantically different by comparing their import specifiers (`foo` and `bar`). For the purpose of merging, we choose the former. It is more useful to compare their source, and consider these semantically equivalent. Merging import statements is generally tricky, because Javascript has a few unintuitive rules about how import statements may be structured. For example, you cannot mix a default namespace import with import specifiers, like so:

```js
// Illegal javascript!
import {foo}, * as star from 'source'
import * as star, { foo } from 'source'
```

There's a handful of rules like this, which are explicitly handled in the default merge strategy for `ImportDeclaration`. See `strategy.js` for more.

### Node Reducers

We now get to our second question above - _how_ do we merge AST nodes, once we identify which ones we wish to merge? In this approach, we answer this question with a "node reducers".

A merge strategy is simply a set of named _reducers_ (like you might pass to `Array.reduce`), along with an `identity` function. Unlike regular reducers, you are not required to return the accumulator. Instead, you modify the accumulator in place (you may return something from your reducer, but it will be ignored). The reducers' names are Babel node types. If, for example, you wanted to merge array expressions by simply concatenating their contents together, you might write a strategy like the following:

```js
const strategy = {
  ArrayExpression: (lhs, rhs) => {
    lhs.elements = [...lhs.elements, ...rhs.elements]
  },
}
```

And if you also wanted to also merge object expressions by merging their key/value pairs (AKA properties), you could write:

```js
const strategy = {
  ArrayExpression: (lhs, rhs) => { lhs.elements = [...lhs.elements, ...rhs.elements] }
  ObjectExpression: (lhs, rhs) => { lhs.properties = [...lhs.properties, ...rhs.properties] }
}
```

Notably, this particular `ObjectExpression` strategy might prove troublesome. If `lhs` and `rhs` are guaranteed to have strictly different property names, this will work fine. But if they overlap, you'll produce an ObjectExpression with duplicate properties, which is legal, but likely a bug:

```js
// a.js
const x = { foo: 'foo1' }
// b.js
const x = { foo: 'foo2' }
// <merged>
const x = { foo: 'foo1', foo: 'foo2' } // Probably a bug.
```

At this stage, you have two choices. Assuming you're using semantic identity to identify your merge candidates, you can 1) recursively define the problem as how to merge the string literals `'foo'` and `'bar'`, since they have the same semantic identity, or 2) define a merge strategy that filters out this possibility by only merging properties with different keys.

Option 1 looks like this:

```js
const strategy = {
  ObjectExpression: (lhs, rhs) => { lhs.properties = [...lhs.properties, ...rhs.properties] }
  StringLiteral: (lhs, rhs) => { lhs.value = `${lhs.value}|${rhs.value}` }
}
// Would merge a.js and b.js as:
const x = { foo: 'foo1|foo2' }
```

Option 2 looks like this:

```js
const propertyEquality = (lprop, rprop) => lprop.key.name === rprop.key.name
const strategy = {
  ObjectExpression: (lhs, rhs) => {
    // Assuming the presence of lodash
    lhs.properties = _.uniqWith(
      [...lhs.properties, ...rhs.properties],
      propertyEquality,
    )
  },
}
// Would merge a.js and b.js as:
const x = { foo: 'foo' }
```

### Opaqueness

Often, you'll want to define a strategy that treats certain AST nodes as "opaque", meaning their contents should not be recursively merged. Let's assume we have a simple strategy that concatenates the elements in ArrayExpressions.

```js
const strategy = {
  ArrayExpression: (lhs, rhs) => {
    lhs.elements = [...lhs.elements, ...rhs.elements]
  },
}
```

Then, given the following, we'll recursively merge nested ArrayExpressions by default.

```js
// a.js
const x = [1, [3, [5]]]
// b.js
const x = [2, [4, [6]]]
// merged:
const x = [1, 2, [3, 4, [5, 6]]]
```

Depending on your use case, that might be what you want. If it isn't, we need a way to define a merge strategy that prevents the nested arrays from being merged. To do this, we use the function `opaquely`. We use an adverb ("opaquely" rather than "opaque") to indicate that `opaquely` itself takes a strategy, and also marks that strategy as the final authority on how to merge the contents of the AST node it names. Let's see an example:

```js
const strategy = {
  ArrayExpression: opaquely((lhs, rhs) => {
    lhs.elements = [...lhs.elements, ...rhs.elements]
  }),
}
```

Given this strategy, we'd merge the above example as:

```js
// a.js
const x = [1, [3, [5]]]
// b.js
const x = [2, [4, [6]]]
// merged:
const x = [1, [3, [5]], 2, [4, [6]]]
```

Notice we've just concatenated the contents of the top-level arrays, and not merged the nested child arrays.

The quintessential use-case for opaqueness is functions - often, you'll want to recursively merge expressions when they appear in your source code, unless they appear inside functions. So, in the case of `FunctionDeclaration` and `ArrowFunctionExpression`, we'll mark our merge strategies as opaque:

```js
const strategy = {
  ArrayExpression: (lhs, rhs) => { lhs.elements = [...lhs.elements, ...rhs.elements] }
  FunctionDeclaration: opaquely((lhs, rhs) => { ??? })
  ArrowFunctionDeclaration: opaquely((lhs, rhs) => { ??? })
}
```

This will successfully prevent the contents of functions (standard, and arrow-style) from being merged. Now, our only task is to write a merge strategy for functions. What do we do when we find two semantically-equivalent functions (that is, two with the same name at the same scope)?

There's no strictly-correct answer for this; you'll likely need different strategies for different applications. You're free to replace the `???` above what whatever function merging strategy is useful to you. `strategy.js` also provides one such strategy: `keepBoth`. `keepBoth` is an opaque strategy for simply putting both the base and extension nodes into the final merge. Similarly, `keepBothStatementParents` is particularly useful for arrow function expressions, which (by themselves) are not complete statements. `(x, y) => x + y` is an incomplete statement, you likely need `const foo = (x, y) => x + y`. To express the desire to keep semantically identical arrow function expressions, and their variable declaration, use `keepBothStatementParents`.

`keepBoth` and `keepBothStatementParents` are strictly opaque strategies, since it's nonsensical to "non-opaquely keep both" - that would imply recursively merging the contents of the extension into the base, _and then_ keep the merged-into base and unmodified extension in the final merge. At the time of writing, the author cannot fathom a reasonable use for this, so you'll have to implement that manually if you need it.

```js
const strategy = {
  ArrayExpression: (lhs, rhs) => { lhs.elements = [...lhs.elements, ...rhs.elements] }
  FunctionDeclaration: keepBoth // Implicitly opaque
  ArrowFunctionDeclaration: keepBothStatementParents // Implicitly opaque
}
```

This will perform the following merge:

```js
// a.js
const letters = ['a', 'b', 'c']
function func(a) {
  return [1, 2, 3].contains(a)
}
// b.js
const letters = ['d', 'e', 'f']
function func(a) {
  return [4, 5, 6].contains(a)
}
// merged
const letters = ['a', 'b', 'c', 'd', 'e', 'f']
function func(a) {
  return [1, 2, 3].contains(a)
}
function func(a) {
  return [4, 5, 6].contains(a)
}
```

Yes, you've produced a naming collision on `func`, but that's precisely what you've asked for with `keepBoth`. Presumably, you'll need to manually fix this collision in your generated code.

### Algorithm Design

This algorithm runs in one full traversal of the base AST, one full traversal of the extension AST, and one O(logn) traversal of the extension AST.

For this example, assume we're using the following source code:

```js
/* base.js */
const x = {
  foo: {
    list: ['rw', 'setup'],
    bar: {
      baz: [1, 2, 3, ['a', 'b', 'c']],
    },
  },
}
const y = 'Alpacas'

/* extension.js */
const x = {
  foo: {
    list: ['ui', 'mantine'],
    bar: {
      value: 10,
      baz: [3, 4, 5, ['d', 'e', 'f']],
    },
  },
}
const y = 'Llamas'
```

and the following strategy:

```js
const strategy = {
  ArrayExpression: concatUnique
  ObjectExpression: concatUnique
}
```

Note we do not consider `StringLiteral` in our strategy.

1. First, it traverses the extension AST and generates an identifier for each node considered by the node reducers.

```js
/* ext.js */
const x = {
  // x
  foo: {
    // x.foo
    // x.foo.list
    list: ['ui', 'mantine'], // x.foo.list.ArrayExpression
    bar: {
      // x.foo.bar
      value: 10, // x.foo.bar.value
      // x.foo.bar.baz
      baz: [
        // x.foo.bar.baz.ArrayExpression
        3,
        4,
        (5)[('d', 'e', 'f')], // x.foo.bar.baz.ArrayExpression.ArrayExpression
      ],
    },
  },
}
const y = 'Llamas' // < is not labeled! >
```

2. Next, it traverses the base AST, and attempts to merge AST nodes **from the leaves, up**. That is, the inner-most expressions are merged first. If, however, a node reducer is marked as "opaque" (described above), that node is considered a leaf for the purpose of merging, and its children are not merged.

```js
/* base.js */
const x = {
  // 8. x
  foo: {
    // 7. x.foo
    // 6. x.foo.list
    list: ['rw', 'setup'], // 5. x.foo.list.ArrayExpression
    bar: {
      // 4. x.foo.bar
      // 3. x.foo.bar.baz
      baz: [
        // 2. x.foo.bar.baz.ArrayExpression
        1,
        2,
        3,
        ['a', 'b', 'c'], // 1. x.foo.bar.baz.ArrayExpression.ArrayExpression
      ],
    },
  },
}

const y = 'Alpacas' // < is not merged! >
```

1. `x.foo.bar.baz.ArrayExpression.ArrayExpression` finds a semantic match in `ext` (the anonymous array`['d', 'e', 'f']`) and uses the `concatUnique` strategy. The base AST is updated, such that it represents the following:

```js
/* base.js.1 */
const x = {
  foo: {
    list: ['rw', 'setup'],
    bar: {
      baz: [1, 2, 3, ['a', 'b', 'c', 'd', 'e', 'f']],
    },
  },
}
const y = 'Alpacas'
```

And the corresponding anonymous array in `ext` is pruned - you can think of this as the base "taking" the array out of its AST and putting it into its own.

```js
/* extension.js.1 */
const x = {
  foo: {
    list: ['ui', 'mantine'],
    bar: {
      value: 10,
      baz: [3, 4, 5],
    },
  },
}
const y = 'Llamas'
```

2. Proceeding upward, we get to `x.foo.bar.baz.ArrayExpression`, the array containing our formerly-merged nested array. The values `[3, 4, 5]` are merged into the base node using the `concatUnique` strategy. Since `3` appears in the base array, it is not merged. (It would be had we chosen `concat` as our strategy). Now, if we try to naively remove the `ArrayExpression` from the extension AST, we'll be left with malformed javascript, due to an imbalanced `baz:` with nothing on its right side. Our pruning algorithm knows this, and sees that `baz` is now "empty", and removes that as well. We now have:

```js
/* base.js.2 */
const x = {
  foo: {
    list: ['rw', 'setup'],
    bar: {
      baz: [1, 2, 3, 4, 5, ['a', 'b', 'c', 'd', 'e', 'f']],
    },
  },
}
const y = 'Alpacas'

/* extension.js.2 */
const x = {
  foo: {
    list: ['ui', 'mantine'],
    bar: {
      value: 10,
    },
  },
}
const y = 'Llamas'
```

3. Since there exists no `x.foo.bar.value` in the base, we ignore it in the extension for now. That value is merged by the merge of its parent, `bar`.

4. To merge `x.foo.bar`, we merge the properties of both `ObjectExpressions` from the base and the extension. At this stage in the algorithm, that's `baz: [1, 2, 3, 4, 5, ['a', 'b', 'c', 'd', 'e', 'f']]` and `value: 10`, respectively. This act "consumes" the `ObjectExpression` to the right hand side of `bar:`, and as before with `baz`, it is removed.

```js
/* base.js.4 */
const x = {
  foo: {
    list: ['rw', 'setup'],
    bar: {
      baz: [1, 2, 3, 4, 5, ['a', 'b', 'c', 'd', 'e', 'f']],
      value: 10,
    },
  },
}
const y = 'Alpacas'

/* extension.js.4 */
const x = {
  foo: {
    list: ['ui', 'mantine'],
  },
}
const y = 'Llamas'
```

5. As before, we merge `x.foo.list.ArrayExpression` by concatenating the unique elements of the extension into the base. This action leaves the extension's `list:` without a right-hand-side, so it is removed as part of this step.

```js
/* base.js.5 */
const x = {
  foo: {
    list: ['rw', 'setup', 'ui', 'mantine'],
    bar: {
      baz: [1, 2, 3, 4, 5, ['a', 'b', 'c', 'd', 'e', 'f']],
      value: 10,
    },
  },
}
const y = 'Alpacas'

/* extension.js.5 */
const x = {
  foo: {},
}
const y = 'Llamas'
```

6. Merging `foo` and `x` then become rather straightforward, as both will be empty `ObjectExpressions` when they're merged. These two steps will leave `const x;` in the extension, since we've merged the right hand side of its initialization expression. That's malformed Javascript, so our merge strategy removes the `const x` from the extension, since it's already merged all of its meaningful content. We're left with:

```js
/* base.js.6 */
const x = {
  foo: {
    list: ['rw', 'setup', 'ui', 'mantine'],
    bar: {
      baz: [1, 2, 3, 4, 5, ['a', 'b', 'c', 'd', 'e', 'f']],
      value: 10,
    },
  },
}
const y = 'Alpacas'

/* extension.js.6 */
const y = 'Llamas'
```

3. Then, any remaining module-scope expressions in the extension AST are copied into the base AST.

```js
/* base.js.6 */
const x = {
  foo: {
    list: ['rw', 'setup', 'ui', 'mantine'],
    bar: {
      baz: [1, 2, 3, 4, 5, ['a', 'b', 'c', 'd', 'e', 'f']],
      value: 10,
    },
  },
}
const y = 'Alpacas'
const y = 'Llamas' // Note: name collision.
```

This operation considers how variables are used and declared in both files. The nodes are merged at positions such that variable usages appear after variable definitions. For example:

```js
// base.js
const x = 1
const list = [x]
// ext.js
const y = 2
const list = [y]
// merged.js
const x = 1
const y = 2
const list = [x, y]
```

Note: to prevent the possibility of cyclic dependencies, e.g.:

```js
// base.js
const y = [...x, 1, 2, 3]
// ext.js
const x = [...y, 4, 5, 6]
```

we require that the contents of base are well-formed Javascript. Note that this constraint does not apply to the extension - code merged from the extension file may refer to bindings only declared in the base code:

```js
// base.js
const x = [1, 2, 3]
// ext.js
const y = [...x, 4, 5, 6]
// merged
const x = [1, 2, 3]
const y = [...x, 4, 5, 6]
```

## Merge Strategies

### concat

Merges two AST nodes by appending the meaningful contents of the extension to the meaningful contents of the base. Meaningful content is defined on a per-node basis, and strives to be "what you expect":

`ArrayExpression`'s meaningful contents are the elements in the array.
`ObjectExpression`'s meaningful contents are its key/value pairs.
`StringLiteral`'s meaningful content is its value.

As of this writing, these are the only node types supported, but others may be added by updating `strategy.js`.

### concatUnique

Merges two AST nodes by appending the meaningful contents of the extension to the meaningful contents of the base, omitting duplicates. Meaningful content is defined on a per-node basis, and strives to be "what you expect":

`ArrayExpression`'s meaningful contents are the elements in the array.
`ObjectExpression`'s meaningful contents are its key/value pairs.

As of this writing, these are the only node types supported, but others may be added by updating `strategy.js`.

### interleave

Merges two AST nodes like `concatUnique`, with the added permission to create and append AST nodes as needed. This is necessary when the straightforward concatenation of two AST nodes might produce invalid Javascript. The primary (as of this writing, only) use case is for `ImportDeclarations`, which have a few odd rules that make the following invalid:

```js
import *, { foo } from 'source'
import *, defaultImport from 'source'
import defaultImport, * from 'source'
```

Arguably, this strategy might just be thought of as the `concatUnique` implementation for `ImportDeclarations`, but the author believes the ability to create new AST nodes makes `interleave` conceptually distinct from `concatUnique`.

As of this writing, only `ImportDeclarations` can be `interleave`d.

### opaquely

This is a strategy-modifier. It is a function which takes a strategy, and returns a strategy. In this particular case, `opaquely` simply marks the given strategy as "opaque", meaning that the strategy handles the merge for a particular AST node (say, a `FunctionDeclaration`) and the children of that type of node should not be recursively merged by other strategies.

For example, given the following strategy:

```js
const strategy = {
  ArrayExpression: concatUnique
  FunctionDeclaration: opaquely((lhs, rhs) => lhs.body = [...lhs.body, ...rhs.body])
}
```

The following demonstrates a simple merge:

```js
/* base.js */
const x = [1, 2, 3]
function y(a) {
  const arr = ['a', 'b', 'c']
  return arr.includes(a)
}
/* extension.js */
const x = [3, 4, 5]
function y(a) {
  const arr = ['c', 'd', 'e']
  return arr.includes(a)
}
/* merge.js */
const x = [1, 2, 3, 4, 5]
function y(a) {
  const arr = ['a', 'b', 'c']
  return y.includes(a)
  const arr = ['c', 'd', 'e']
  return y.includes(a)
}
```

Notice that the array `arr` is not merged before the bodies of both versions of `y` are merged. `opaquely` tells the merge algorithm that the strategy provided (`(lhs, rhs) => lhs.body = [...lhs.body, ...rhs.body]`) is all that should be done to merge the contents of `FunctionDeclaration`s.
