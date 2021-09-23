export const standard = defineScenario({
  user: {
    one: {
      data: {
        email: 'String4870974',
      },
    },
    two: {
      data: {
        email: 'String2695864',
      },
    },
  },
})

export const myOtherScenario = defineScenario({
  modelOne: {
    foo: {
      data: {
        id: 55,
      },
    },
    barr: {
      data: {
        id: 77,
      },
    },
  },
  modelTwo: {
    one: {
      data: {
        name: 'alice',
      },
    },
    fifteen: {
      data: {
        name: 'esteban',
      },
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
      data: {
        url: 'https://tapes.bucket/one.mp4',
        active: true,
        ...userCreateOrConnect,
      },
    },
    two: {
      data: {
        url: 'https://tapes.bucket/two.mp4',
        active: true,
        ...userCreateOrConnect,
      },
    },
    three: {
      data: {
        url: 'https://tapes.bucket/three.mp4',
        shareSlug: 'share-slug-to-find',
        active: true,
        ...userCreateOrConnect,
      },
    },
    expired: {
      data: {
        url: 'https://tapes.bucket/four.mp4',
        active: false,
        expired: true,
        ...userCreateOrConnect,
      },
    },
  },
})
