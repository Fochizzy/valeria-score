# Release setup

Runbook for the services the app integrates with. Everything below is wired
in code and safe to ignore until you want the feature live.

## Crash reporting (Sentry) — needs a DSN

Code is fully wired (`lib/monitoring.ts`); it is a no-op until a DSN exists.

1. Create a project at sentry.io (platform: React Native).
2. Put the DSN in `.env` **and** in the EAS `production` environment:

   ```
   EXPO_PUBLIC_SENTRY_DSN=https://...@...ingest.sentry.io/...
   ```

3. Rebuild. Errors are disabled in dev builds and tagged with the signed-in
   user id in production.

Optional (readable native stack traces): set `SENTRY_AUTH_TOKEN`,
`SENTRY_ORG`, `SENTRY_PROJECT` as EAS secrets so sourcemaps upload during
builds, and remove `SENTRY_DISABLE_AUTO_UPLOAD` from the `env` blocks in
`eas.json` (it is there so builds never fail while those secrets are absent).

## Push notifications — needs Firebase (FCM)

Everything is wired: token registration (`lib/notifications.ts`), the
`push_tokens` table (migration `20260816090000`), the `notify-game-finished`
edge function, and the finish-game triggers. Android pushes deliver only
after FCM credentials exist:

1. Create a Firebase project, add an Android app with package
   `com.fochizzy87.valeriascore`, and download `google-services.json` into
   the repo root (safe to commit; contains no secrets).
2. Point the app config at it — in `app.json` under `"android"`:
   `"googleServicesFile": "./google-services.json"`. EAS builds prebuild the
   native project from app.json, so this is all they need. (For local
   `expo run:android` builds with the committed `android/` folder, also copy
   the file to `android/app/` and add the google-services gradle plugin.)
3. In Firebase console → Project settings → Service accounts, generate a
   **service account key**, then upload it:
   `eas credentials -p android` → FCM V1 service account.
4. Rebuild. Until then, token registration fails silently and nothing else
   is affected.

## OTA updates (EAS Update) — ready now

Builds are pinned to `runtimeVersion` `1.0.0` with channels
`development` / `preview` / `production` (see `eas.json`).

Ship a JS-only fix to production installs without a Play review:

```
eas update --channel production --message "fix: <what changed>"
```

Rules of thumb:

- JS/TS-only changes: publish an update.
- Anything native changed (new native module, SDK upgrade, manifest change):
  bump `runtimeVersion` in `app.json` **and**
  `expo_runtime_version` in `android/app/src/main/res/values/strings.xml`,
  then ship a full store build.

## Scaling note: analytics refresh

Every `session_scores` write fires a statement-level trigger that runs
`private.rebuild_public_analytics()`. This is fine at the current data size,
but it is the first thing to revisit as tables grow: the standard evolution
is to drop the triggers and refresh on a schedule instead (pg_cron every
minute or so), trading a little stat freshness for write throughput. No
action needed until score writes feel slow.

## History CSV export

`Manage Data → Completed Games → Export CSV` shares a spreadsheet with one
row per seat per finished game plus solo runs. No setup required.
