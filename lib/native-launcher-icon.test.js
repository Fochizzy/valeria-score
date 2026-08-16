import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const androidResDir = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res')

const staleLauncherHashes = new Map([
  ['mipmap-mdpi/ic_launcher', 'EEF20F25FB1477D8C9DF15757E764811CC503FB0777F18D0F7FB2D19178B5BF6'],
  ['mipmap-hdpi/ic_launcher', 'DED7AABF6A56B694E486E096EFD89E2F0C9067D292B634663898E352C9491F10'],
  ['mipmap-xhdpi/ic_launcher', 'E77C5045BFDB6F4BBE955B3A793BFED3BAA369CE4811AE2A9103D5480637CFFF'],
  ['mipmap-xxhdpi/ic_launcher', 'EB3A34B13632E0CB3B1C0F4273035866CBE81B1B17B7178CE29D19C78D394A5E'],
  ['mipmap-xxxhdpi/ic_launcher', '9FF27328B6916B7F75B99EF36153F154BB4724946E5654635CBA2E257352C69F'],
  ['mipmap-mdpi/ic_launcher_round', '520D05F978A15BA0CCF23006A1A5691A054A02478C70CAFC5EBAFAE76E600F0D'],
  ['mipmap-hdpi/ic_launcher_round', '21304A0C9B00DA6A72CFA31C7229C9528FC17B6E5EB4E68A969BCE08C01A2FEE'],
  ['mipmap-xhdpi/ic_launcher_round', '2846E1A703E519791FE22F41BCB243B82F908D12E5EBCB43F020DDF9982780B0'],
  ['mipmap-xxhdpi/ic_launcher_round', '363A569BEB72E8B007BF046454612148D4C9F782B9391352059FE83179F18E30'],
  ['mipmap-xxxhdpi/ic_launcher_round', '5BACD97A1B41E4413C6092CDBD83F65112A9124E823CFAA3A219C65E2761647B'],
])

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toUpperCase()
}

function findResourceFile(resourceDirName, baseName) {
  const resourceDir = path.join(androidResDir, resourceDirName)
  const matchingFiles = fs
    .readdirSync(resourceDir)
    .filter((entry) => path.parse(entry).name === baseName)
    .map((entry) => path.join(resourceDir, entry))

  assert.equal(
    matchingFiles.length,
    1,
    `Expected exactly one ${baseName} resource in ${resourceDir}`
  )

  return matchingFiles[0]
}

test('native Android launcher icons are not the stale default Android resources', (t) => {
  // The android/ folder is gitignored (EAS prebuilds from app.json), so this
  // guard only applies on machines that keep a local native project — CI
  // checkouts have nothing to inspect.
  if (!fs.existsSync(androidResDir)) {
    t.skip('android/ native project not present in this checkout')
    return
  }

  for (const resourceKey of staleLauncherHashes.keys()) {
    const [resourceDirName, baseName] = resourceKey.split('/')
    const resourceFilePath = findResourceFile(resourceDirName, baseName)
    const currentHash = sha256(resourceFilePath)

    assert.notEqual(
      currentHash,
      staleLauncherHashes.get(resourceKey),
      `${resourceKey} is still the stale default launcher asset`
    )
  }
})
