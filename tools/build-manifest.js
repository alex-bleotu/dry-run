const fs = require('node:fs');
const path = require('node:path');

const { MANIFEST_NAME, buildProblemEntry } = require('../updater');

const PROBLEMS_DIRECTORY = path.join(__dirname, '..', 'problems');
const MANIFEST_PATH = path.join(PROBLEMS_DIRECTORY, MANIFEST_NAME);

const entryList = fs
  .readdirSync(PROBLEMS_DIRECTORY, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(PROBLEMS_DIRECTORY, entry.name, 'meta.json')))
  .map((entry) => buildProblemEntry(entry.name, path.join(PROBLEMS_DIRECTORY, entry.name)))
  .sort((left, right) => left.id.localeCompare(right.id));
const manifestText = `${JSON.stringify({ problems: entryList }, null, 2)}\n`;

if (process.argv.includes('--check')) {
  const current = fs.existsSync(MANIFEST_PATH) ? fs.readFileSync(MANIFEST_PATH, 'utf8') : '';
  if (current !== manifestText) {
    console.error('problems/index.json is out of date. Run: npm run manifest');
    process.exitCode = 1;
  } else {
    console.log('problems/index.json is up to date');
  }
} else {
  fs.writeFileSync(MANIFEST_PATH, manifestText);
  console.log(`manifest: ${entryList.length} problems`);
}
