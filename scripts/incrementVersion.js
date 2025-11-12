import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Načíst package.json
const packageJsonPath = resolve(__dirname, '../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

// Zvýšit patch verzi (např. 1.1.0 -> 1.1.1)
const oldVersion = packageJson.version;
const versionParts = oldVersion.split('.');
const major = parseInt(versionParts[0]);
const minor = parseInt(versionParts[1]);
const patch = parseInt(versionParts[2]) + 1;

const newVersion = `${major}.${minor}.${patch}`;
packageJson.version = newVersion;

// Uložit zpět do package.json
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');

console.log(`✅ Verze aktualizována: ${oldVersion} -> ${newVersion}`);

