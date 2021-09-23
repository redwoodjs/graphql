export const standard = defineScenario({
  user: {
    one: {
      email: 'String4870974',
    },
    two: {
      email: 'String2695864',
    },
  },
})

export const myOtherScenario = defineScenario({
  modelOne: {
    foo: {
      id: 55,
    },
    barr: {
      id: 77,
    },
  },
  modelTwo: {
    one: {
      name: 'alice',
    },
    fifteen: {
      name: 'esteban',
    },
  },
})

// This is a real example
// ----------------------
const userCreateOrConnect = {
  user: {
    connectOrCreate: {
      create: {
        email: 'mockedemail@example.com',
        id: 'mocked-user-123',
      },
      where: {
        id: 'mocked-user-123',
      },
    },
  },
}

export const realExample = defineScenario({
  tape: {
    one: {
      url: 'https://tapes.bucket/one.mp4',
      active: true,
      ...userCreateOrConnect,
    },
    two: {
      url: 'https://tapes.bucket/two.mp4',
      active: true,
      ...userCreateOrConnect,
    },
    three: {
      url: 'https://tapes.bucket/three.mp4',
      shareSlug: 'share-slug-to-find',
      active: true,
      ...userCreateOrConnect,
    },
    expired: {
      url: 'https://tapes.bucket/four.mp4',
      active: false,
      expired: true,
      ...userCreateOrConnect,
    },
  },
})
