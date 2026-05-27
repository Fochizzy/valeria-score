import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const profileSource = fs.readFileSync(path.join(process.cwd(), 'lib', 'profile.ts'), 'utf8')

test('profile claim helper uses claim_guest_profile rpc instead of player_scores writes', () => {
  assert.match(profileSource, /rpc\(\s*'claim_guest_profile'/)
  assert.doesNotMatch(profileSource, /from\('player_scores'\)/)
  assert.doesNotMatch(profileSource, /\.update\(\{\s*user_id:/s)
})
