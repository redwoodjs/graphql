// Some of the examples here are from https://babeljs.io/docs/babel-plugin-transform-runtime/#core-js-aliasing.

var sym = Symbol()

var promise = Promise.resolve()

var check = arr.includes('yeah!')

console.log(arr[Symbol.iterator]())

Promise.allSettled()

console.log([].includes('bazinga'))

Promise.any()

Object.hasOwn({ x: 2 }, 'x')

var arr = [1, 2, 3]
arr.at(0) === 1
