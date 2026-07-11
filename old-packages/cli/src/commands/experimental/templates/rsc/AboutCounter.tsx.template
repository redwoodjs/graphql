'use client'

import React from 'react'

// @ts-expect-error no types
import styles from './Counter.module.css'
import './Counter.css'

export const AboutCounter = () => {
  const [count, setCount] = React.useState(0)

  return (
    <div style={{ border: '3px blue dashed', margin: '1em', padding: '1em' }}>
      <p>Count: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
      <h3 className={styles.header}>This is a client component.</h3>
      <p>RSC on client: {globalThis.RWJS_EXP_RSC ? 'enabled' : 'disabled'}</p>
    </div>
  )
}
