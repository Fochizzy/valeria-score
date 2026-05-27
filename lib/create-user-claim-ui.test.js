import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const createUserSource = fs.readFileSync(
  path.join(process.cwd(), 'app', 'create-user.tsx'),
  'utf8'
)
const loginSource = fs.readFileSync(path.join(process.cwd(), 'app', 'login.tsx'), 'utf8')

test('create-user guest-claim UI only asks for the guest player id', () => {
  assert.doesNotMatch(createUserSource, /Guest Display Name/)
  assert.doesNotMatch(createUserSource, /guestDisplayName/)
  assert.match(createUserSource, /Guest Player ID/)
  assert.match(
    createUserSource,
    /normalizeClaimGuestInput\(\s*{\s*publicPlayerId:\s*guestPlayerId,\s*}\s*\)/s
  )
})

test('login redeems pending guest claims by player id only', () => {
  assert.doesNotMatch(loginSource, /CLAIM_GUEST_DISPLAY_NAME_KEY/)
  assert.doesNotMatch(loginSource, /p_display_name/)
  assert.match(loginSource, /p_public_player_id:\s*input\.publicPlayerId/)
})
