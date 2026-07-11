import React from 'react'

import { act, render, waitFor } from '@testing-library/react'
import { test } from 'vitest'

import { navigate } from '../history.js'
import { Route } from '../Route.js'
import { Router } from '../router.js'

const RedirectedRoutes = () => {
  const SimplePage = () => <h1>FindMeSimple</h1>
  const NamedPage = () => <h1>FindMeNamed</h1>
  const FooBarPage = (props: unknown) => (
    <>
      <h1>FindMeFooBar</h1>
      <pre>
        <code>{JSON.stringify(props)}</code>
      </pre>
    </>
  )

  return (
    <Router>
      <Route path="/simple" redirect="/newSimple" name="simple" />
      <Route path="/newSimple" name="newSimple" page={SimplePage} />
      <Route path="/named" redirect="newNamedRoute" name="named" />
      <Route path="/newNamed" name="newNamedRoute" page={NamedPage} />
      <Route
        path="/foobar/{foo:Int}/{bar}"
        redirect="newFooBar"
        name="fooBar"
      />
      <Route
        path="/newFooBar/{foo:Int}/{bar}"
        name="newFooBar"
        page={FooBarPage}
      />
    </Router>
  )
}

test('Redirected route', async () => {
  const screen = render(<RedirectedRoutes />)
  act(() => navigate('/simple'))

  await waitFor(() => screen.getByText('FindMeSimple'))
})

test('Redirected route using route name as target', async () => {
  const screen = render(<RedirectedRoutes />)
  act(() => navigate('/named'))

  await waitFor(() => screen.getByText('FindMeNamed'))
})

test('Redirected route using route name as target, with typed path params', async () => {
  const screen = render(<RedirectedRoutes />)
  act(() => navigate('/foobar/1/2'))

  await waitFor(() => screen.getByText('FindMeFooBar'))
  await waitFor(() => screen.getByText('{"foo":1,"bar":"2"}'))
})
