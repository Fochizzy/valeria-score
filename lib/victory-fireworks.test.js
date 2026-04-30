import assert from 'node:assert/strict'
import test from 'node:test'

import { createVictoryFireworkBursts } from './victory-fireworks.ts'

test('createVictoryFireworkBursts returns short non-blocking burst config', () => {
  const bursts = createVictoryFireworkBursts()

  assert.equal(Array.isArray(bursts), true)
  assert.equal(bursts.length >= 3, true)
  assert.equal(
    bursts.every(
      (burst) =>
        typeof burst.key === 'string' &&
        typeof burst.color === 'string' &&
        burst.durationMs <= 4000
    ),
    true
  )
})
