import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildHistoryExportCsv,
  buildHistoryExportFileName,
  escapeCsvField,
  HISTORY_EXPORT_HEADER,
} from './history-export.ts'

test('escapeCsvField quotes commas, quotes, and newlines', () => {
  assert.equal(escapeCsvField('plain'), 'plain')
  assert.equal(escapeCsvField('a,b'), '"a,b"')
  assert.equal(escapeCsvField('say "hi"'), '"say ""hi"""')
  assert.equal(escapeCsvField('line\nbreak'), '"line\nbreak"')
  assert.equal(escapeCsvField(null), '')
  assert.equal(escapeCsvField(0), '0')
})

test('buildHistoryExportCsv emits one row per multiplayer seat', () => {
  const csv = buildHistoryExportCsv({
    sessionGames: [
      { id: 'session-1', joinCode: 'ABC123', finishedAt: '2026-08-01T18:30:00Z' },
    ],
    scoreRowsBySession: new Map([
      [
        'session-1',
        [
          {
            session_id: 'session-1',
            player_name: null,
            recap_player_name: 'Izzy',
            recap_player_id: 'FOCHIZZY',
            duke_slug: 'unknown_duke_slug',
            score_total: 44,
            placement: 1,
            is_winner: true,
          },
          {
            session_id: 'session-1',
            player_name: 'Guest, "The Bold"',
            duke_slug: null,
            score_total: 31,
            placement: 2,
            is_winner: false,
          },
        ],
      ],
    ]),
    soloGames: [],
  })

  const lines = csv.split('\r\n')

  assert.equal(lines[0], HISTORY_EXPORT_HEADER.join(','))
  assert.equal(lines.length, 3)
  assert.match(lines[1], /^multiplayer,2026-08-01,ABC123,Izzy,FOCHIZZY,/)
  assert.match(lines[1], /,44,1,yes$/)
  assert.match(lines[2], /"Guest, ""The Bold"""/)
  assert.match(lines[2], /,31,2,no$/)
})

test('buildHistoryExportCsv emits two rows per solo game', () => {
  const csv = buildHistoryExportCsv({
    sessionGames: [],
    scoreRowsBySession: new Map(),
    soloGames: [
      {
        playerDukeSlug: 'some_duke',
        darkLordDukeSlug: 'other_duke',
        winner: 'dark_lord',
        playerTotal: 38,
        darkLordTotal: 41,
        createdAt: '2026-07-15T02:00:00Z',
        updatedAt: null,
      },
    ],
  })

  const lines = csv.split('\r\n')

  assert.equal(lines.length, 3)
  assert.match(lines[1], /^solo,2026-07-15,,You,,/)
  assert.match(lines[1], /,38,,no$/)
  assert.match(lines[2], /^solo,2026-07-15,,Dark Lord,,/)
  assert.match(lines[2], /,41,,yes$/)
})

test('buildHistoryExportCsv with no games is just the header', () => {
  const csv = buildHistoryExportCsv({
    sessionGames: [],
    scoreRowsBySession: new Map(),
    soloGames: [],
  })

  assert.equal(csv, HISTORY_EXPORT_HEADER.join(','))
})

test('buildHistoryExportFileName stamps the date', () => {
  assert.equal(
    buildHistoryExportFileName('2026-08-16T10:00:00Z'),
    'valeria-score-history-2026-08-16.csv'
  )
  assert.equal(buildHistoryExportFileName('not a date'), 'valeria-score-history-export.csv')
})
