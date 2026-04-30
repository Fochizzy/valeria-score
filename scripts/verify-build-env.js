const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');

function fail(message) {
  console.error(`\n[build-env] ${message}\n`);
  process.exit(1);
}

function readEnvValue(source, key) {
  const pattern = new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`, 'm');
  const match = source.match(pattern);

  if (!match) {
    return '';
  }

  const rawValue = match[1].trim();

  if (
    (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
    (rawValue.startsWith("'") && rawValue.endsWith("'"))
  ) {
    return rawValue.slice(1, -1).trim();
  }

  return rawValue;
}

if (!fs.existsSync(envPath)) {
  fail(
    'Missing .env. Create one with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY before running an EAS build.'
  );
}

const envSource = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = readEnvValue(envSource, 'EXPO_PUBLIC_SUPABASE_URL');
const supabaseKey = readEnvValue(envSource, 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

if (!supabaseUrl) {
  fail('Missing EXPO_PUBLIC_SUPABASE_URL in .env.');
}

if (!supabaseKey) {
  fail('Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.');
}

console.log('[build-env] Found required Expo public Supabase variables.');
