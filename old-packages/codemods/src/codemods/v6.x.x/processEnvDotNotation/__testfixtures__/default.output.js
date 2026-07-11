process.env.NODE_ENV
process.env.ACCESS_TWO
process.env.ACCESS_THREE

if (process.env.NODE_ENV === 'production') {
  console.log('Im in production')
}

process.env.KITTENS.replaceAll('claws', 'cuddles')
