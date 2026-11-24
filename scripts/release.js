// Publish a new version to GitHub so that installed copies can update themselves.
//
//   1. Change "version" in package.json (e.g. 1.5.0 -> 1.5.1)
//   2. Write the release notes in a file, e.g. notes.md
//   3. npm run release -- notes.md
//
// This runs the tests, builds the Setup and Portable .exe files, and creates the
// GitHub release vX.Y.Z with the files the in-app updater needs:
//   Samayam-Setup-X.Y.Z.exe, its .blockmap, latest.yml, Samayam-Portable-X.Y.Z.exe
// Needs the GitHub CLI (gh) logged in.
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const { version } = require(path.join(root, 'package.json'));
const notes = process.argv[2];
const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });

if (!notes || !fs.existsSync(notes)) {
  console.error('Usage: npm run release -- <release-notes.md>');
  process.exit(1);
}
const tag = 'v' + version;
try {
  execSync(`gh release view ${tag}`, { cwd: root, stdio: 'ignore' });
  console.error(`Release ${tag} already exists. Raise "version" in package.json first.`);
  process.exit(1);
} catch { /* not published yet - good */ }

run('npm test');
fs.rmSync(path.join(root, 'dist'), { recursive: true, force: true });
run('npm run dist');

const files = [
  `dist/Samayam-Setup-${version}.exe`,
  `dist/Samayam-Setup-${version}.exe.blockmap`,
  'dist/latest.yml',
  `dist/Samayam-Portable-${version}.exe`
];
for (const f of files) if (!fs.existsSync(path.join(root, f))) throw new Error('Missing build file: ' + f);

run(`gh release create ${tag} ${files.map((f) => `"${f}"`).join(' ')} --title "Samayam ${version}" --notes-file "${notes}"`);
console.log(`\nPublished ${tag}. Installed copies will offer this update.`);
