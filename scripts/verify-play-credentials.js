const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Where `eas.json`'s submit profiles expect the key. Override for CI, which
// writes the secret to a temp path instead of the repo root.
const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH
  ? path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH)
  : path.join(process.cwd(), 'play-service-account.json');

const scope = 'https://www.googleapis.com/auth/androidpublisher';
const offline = process.argv.includes('--offline');

class CredentialError extends Error {}

// Never process.exit() here: on Windows, exiting while a fetch keep-alive
// socket is tearing down trips a libuv assertion and reports 127 instead of 1,
// which would break the `&&` chains in the publish scripts.
function fail(message) {
  throw new CredentialError(message);
}

function ok(message) {
  console.log(`[play-creds] ${message}`);
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function readPackageName() {
  const appJsonPath = path.join(process.cwd(), 'app.json');

  if (!fs.existsSync(appJsonPath)) {
    fail('Missing app.json — run this from the repo root.');
  }

  const packageName = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'))?.expo?.android?.package;

  if (!packageName) {
    fail('No expo.android.package in app.json; cannot tell which Play listing to check.');
  }

  return packageName;
}

function readKey() {
  if (!fs.existsSync(keyPath)) {
    fail(
      `Missing ${path.relative(process.cwd(), keyPath)}.\n` +
        '           Create a Google Play service account key and save it there.\n' +
        '           Steps: docs/release-setup.md → "Play Store autopublish".'
    );
  }

  let key;

  try {
    key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  } catch (error) {
    fail(`${path.basename(keyPath)} is not valid JSON: ${error.message}`);
  }

  if (key.type !== 'service_account') {
    fail(
      `${path.basename(keyPath)} has type "${key.type}" — expected "service_account". ` +
        'An OAuth client secret download is a different file; re-export from Service Accounts → Keys.'
    );
  }

  for (const field of ['client_email', 'private_key', 'project_id', 'token_uri']) {
    if (!key[field]) {
      fail(`${path.basename(keyPath)} is missing "${field}".`);
    }
  }

  if (!key.private_key.includes('BEGIN PRIVATE KEY')) {
    fail('The "private_key" field does not look like a PEM key. Re-download the JSON rather than hand-editing it.');
  }

  return key;
}

async function fetchAccessToken(key) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const claims = {
    iss: key.client_email,
    scope,
    aud: key.token_uri,
    iat: issuedAt,
    exp: issuedAt + 3600,
  };

  const signingInput = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(JSON.stringify(claims))}`;
  const signature = crypto.createSign('RSA-SHA256').update(signingInput).sign(key.private_key);
  const assertion = `${signingInput}.${signature.toString('base64url')}`;

  const response = await fetch(key.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (body.error === 'invalid_grant') {
      fail(
        'Google rejected the key (invalid_grant). Either the key was deleted/disabled in Google Cloud, ' +
          "or this machine's clock is skewed by more than a few minutes."
      );
    }

    fail(`Token request failed (${response.status}): ${body.error_description || body.error || 'unknown error'}`);
  }

  return body.access_token;
}

// `edits.insert` opens a throwaway transaction. It is the cheapest call that
// proves both API access and listing-level permission; we discard it straight
// after so nothing is left pending in the Play Console.
async function checkPlayAccess(accessToken, packageName) {
  const editsUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits`;
  const response = await fetch(editsUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.ok) {
    const { id } = await response.json();

    await fetch(`${editsUrl}/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});

    return;
  }

  const body = await response.json().catch(() => ({}));
  const reason = body?.error?.message || `HTTP ${response.status}`;

  if (response.status === 403 && /API .*(disabled|not been used)/i.test(reason)) {
    fail(
      'The Google Play Android Developer API is not enabled in this Google Cloud project.\n' +
        `           Enable it, then retry: ${reason}`
    );
  }

  if (response.status === 401 || response.status === 403) {
    fail(
      `The service account authenticated but cannot touch ${packageName}.\n` +
        '           Invite it in Play Console → Users and permissions and grant\n' +
        `           "Release to production" + "Manage store presence" on this app.\n           (${reason})`
    );
  }

  if (response.status === 404) {
    fail(
      `Play Console has no app with package ${packageName} visible to this service account.\n` +
        '           The first AAB must be uploaded manually before the API can publish;\n' +
        `           also confirm the key belongs to the same developer account. (${reason})`
    );
  }

  fail(`Unexpected Play API response: ${reason}`);
}

async function main() {
  const packageName = readPackageName();
  const key = readKey();

  ok(`Key looks well-formed: ${key.client_email}`);

  if (offline) {
    ok('Skipping the live Play API check (--offline).');
    return;
  }

  const accessToken = await fetchAccessToken(key);
  ok('Google issued an androidpublisher access token.');

  await checkPlayAccess(accessToken, packageName);
  ok(`Service account can publish ${packageName}. Autopublish is ready.`);
}

// Global fetch pools sockets; releasing them lets the process exit promptly.
function releaseSockets() {
  const dispatcher = globalThis[Symbol.for('undici.globalDispatcher.1')];
  return Promise.resolve(dispatcher?.close?.()).catch(() => {});
}

main()
  .catch((error) => {
    console.error(`\n[play-creds] ${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(releaseSockets);
