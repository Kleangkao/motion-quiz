/**
 * Creates Motion Quiz release keystore outside the repo.
 * Writes credentials to twa/signing.properties (gitignored). Passwords are not printed.
 */
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const keystoreDir = join(homedir(), '.android');
const keystorePath = join(keystoreDir, 'motion-quiz-release.jks');
const signingPropsPath = join(repoRoot, 'twa', 'signing.properties');
const alias = 'motionquiz';

if (existsSync(keystorePath)) {
  console.log('Release keystore already exists; skipping generation.');
  process.exit(0);
}

mkdirSync(keystoreDir, { recursive: true });
const password = randomBytes(24).toString('base64url');

const dname = 'CN=Motion Quiz, OU=Mobile, O=IslandDAO, C=US';
execFileSync(
  'keytool',
  [
    '-genkeypair',
    '-v',
    '-keystore',
    keystorePath,
    '-alias',
    alias,
    '-keyalg',
    'RSA',
    '-keysize',
    '2048',
    '-validity',
    '10000',
    '-storepass',
    password,
    '-keypass',
    password,
    '-dname',
    dname,
  ],
  { stdio: 'inherit' },
);

const props = [
  `storeFile=${keystorePath.replace(/\\/g, '\\\\')}`,
  `storePassword=${password}`,
  `keyPassword=${password}`,
  `keyAlias=${alias}`,
  '',
].join('\n');

writeFileSync(signingPropsPath, props, { encoding: 'utf8', mode: 0o600 });
console.log('Release keystore created.');
console.log(`Keystore: ${keystorePath}`);
console.log(`Signing props: ${signingPropsPath} (gitignored — back up passwords securely).`);
