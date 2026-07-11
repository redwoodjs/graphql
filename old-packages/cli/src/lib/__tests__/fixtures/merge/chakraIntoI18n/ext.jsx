import * as React from 'react'

import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import * as theme from 'config/chakra.config'

const extendedTheme = extendTheme(theme)

const withChakra = (StoryFn) => {
  return (
    <ChakraProvider theme={extendedTheme}>
      <StoryFn />
    </ChakraProvider>
  )
}

export const decorators = [withChakra]
