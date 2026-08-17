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

## Play Store autopublish — needs a service account JSON

`eas.json` already has the submit profiles and `package.json` the scripts. The
one missing piece is a Google Play service account key, which only you can
create — it is a private credential tied to your Google account.

1. **Google Cloud Console → IAM & Admin → Service Accounts** (use any project;
   create one if you have none). **Create service account**, name it something
   like `play-publisher`, **Create and continue**, then **Done**. No project
   roles are needed — Play Console grants the permissions, not IAM.
2. On the new account's row: **⋮ → Manage keys → Add key → Create new key →
   JSON → Create**. The file downloads immediately and is the only copy Google
   will ever give you. Save it as `play-service-account.json` in the repo root
   (gitignored, and excluded from EAS uploads).
3. **Enable the Google Play Android Developer API** for that same Cloud
   project: <https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com>
   → **Enable**. Skipping this is the most common failure.
4. **Play Console → Users and permissions → Invite new user**. Paste the
   service account's email (`…@….iam.gserviceaccount.com`), and under **App
   permissions** add **Valeria Score** with *View app information*, *Edit and
   delete draft apps*, *Release to production, exclude devices, and use Play
   App Signing*, *Release apps to testing tracks*, *Manage testing tracks and
   edit tester lists*, and *Manage store presence*. **Invite user**.

Then confirm it actually works before spending a build on it:

```
npm run check:play-creds
```

That signs a JWT with the key, exchanges it for a token, and opens/discards a
throwaway Play edit — so a pass means the key, the API, and the Play Console
permissions are all genuinely in place. Each failure mode maps back to the
numbered step above. Add `-- --offline` to check only the file's shape.

Publishing:

```
npm run publish:android              # build + submit to the internal track
npm run submit:android               # submit the latest existing build (no rebuild)
npm run publish:android:production   # build + submit to production — see below
```

Three caveats:

- **The production track is not open to this app yet.** As of the Play Console
  state on 2026-08-16, Valeria Scoring has Production `Inactive` and Google
  gates production access behind completing a qualifying closed test. Closed
  testing (2 tracks) and internal testing are both Active. So
  `publish:android:production` will be rejected until you finish the closed
  test and are approved — `publish:android` (internal) is the working path
  until then.
- **The first release on any track has to be manual.** Google's API cannot
  create a listing that has never had an AAB uploaded through the Play Console
  UI. Not a problem here — the app is already published to test tracks — but
  it applies to any new app.
- **Publishing runs from this machine, not CI.** The `production` build profile
  uses `credentialsSource: "local"`, so signing reads `credentials.json` and
  the keystore at `android/app/valeria-upload-key.jks` — neither is in git. To
  move this into GitHub Actions you would first switch the profile to
  `"remote"` and upload the keystore once via `eas credentials -p android`,
  then store `EXPO_TOKEN` plus the key JSON as repository secrets and point
  `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` at the file the workflow writes.

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
