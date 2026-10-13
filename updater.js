const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MANIFEST_NAME = 'index.json';
const VERSION_FILE_NAME = '.version.json';
const REQUEST_TIMEOUT_MS = 10000;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const PROBLEM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const FILE_PATH_PATTERN = /^(meta\.json|problem\.md|starter\.cpp|tests\/(visible|hidden)\.json)$/;
const INPUT_KEY_PATTERN = /^[a-z][a-zA-Z0-9]{0,31}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SYNCABLE_FILE_LIST = ['meta.json', 'problem.md', 'starter.cpp', 'tests/visible.json', 'tests/hidden.json'];
const REQUIRED_FILE_LIST = ['meta.json', 'problem.md', 'starter.cpp', 'tests/visible.json'];

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function computeVersion(fileList) {
  const lineList = [...fileList]
    .sort((left, right) => left.path.localeCompare(right.path))
    .map((file) => `${file.path}:${file.sha256}`);

  return sha256(Buffer.from(lineList.join('\n')));
}

function buildProblemEntry(id, directory) {
  const files = SYNCABLE_FILE_LIST.filter((filePath) => fs.existsSync(path.join(directory, filePath))).map(
    (filePath) => ({ path: filePath, sha256: sha256(fs.readFileSync(path.join(directory, filePath))) }),
  );

  return { files, id, version: computeVersion(files) };
}

function validateMeta(meta) {
  const isValid =
    meta &&
    typeof meta.title === 'string' &&
    meta.title !== '' &&
    typeof meta.summary === 'string' &&
    typeof meta.difficulty === 'string' &&
    Number.isFinite(meta.order) &&
    Array.isArray(meta.inputKeys) &&
    meta.inputKeys.length > 0 &&
    meta.inputKeys.length <= 8 &&
    meta.inputKeys.every((key) => INPUT_KEY_PATTERN.test(key));
  if (!isValid) {
    throw new Error('meta.json is missing required fields');
  }
}

function validateEntry(entry) {
  if (!entry || !PROBLEM_ID_PATTERN.test(entry.id) || !Array.isArray(entry.files)) {
    throw new Error('Manifest entry is malformed');
  }
  entry.files.forEach((file) => {
    if (!FILE_PATH_PATTERN.test(file.path) || !SHA256_PATTERN.test(file.sha256)) {
      throw new Error(`Manifest entry ${entry.id} lists an invalid file`);
    }
  });
  REQUIRED_FILE_LIST.forEach((required) => {
    if (!entry.files.some((file) => file.path === required)) {
      throw new Error(`Manifest entry ${entry.id} is missing ${required}`);
    }
  });
  if (entry.version !== computeVersion(entry.files)) {
    throw new Error(`Manifest entry ${entry.id} has an inconsistent version`);
  }
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: { 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error(`${url} is larger than ${MAX_FILE_BYTES} bytes`);
  }

  return buffer;
}

async function downloadProblem(baseUrl, entry, downloadedDirectory) {
  const temporaryDirectory = path.join(downloadedDirectory, `.tmp-${entry.id}`);
  fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  try {
    for (const file of entry.files) {
      const buffer = await fetchBuffer(`${baseUrl}/${entry.id}/${file.path}`);
      if (sha256(buffer) !== file.sha256) {
        throw new Error(`Checksum mismatch for ${entry.id}/${file.path}`);
      }
      const target = path.join(temporaryDirectory, file.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buffer);
    }
    validateMeta(JSON.parse(fs.readFileSync(path.join(temporaryDirectory, 'meta.json'), 'utf8')));
    fs.writeFileSync(path.join(temporaryDirectory, VERSION_FILE_NAME), JSON.stringify({ version: entry.version }));
    const finalDirectory = path.join(downloadedDirectory, entry.id);
    fs.rmSync(finalDirectory, { force: true, recursive: true });
    fs.renameSync(temporaryDirectory, finalDirectory);
  } catch (error) {
    fs.rmSync(temporaryDirectory, { force: true, recursive: true });
    throw error;
  }
}

async function syncProblems({ baseUrl, downloadedDirectory, getInstalledVersion }) {
  const result = { added: [], error: null, failed: [], updated: [] };
  let entryList;
  try {
    const manifest = JSON.parse((await fetchBuffer(`${baseUrl}/${MANIFEST_NAME}`)).toString('utf8'));
    if (!Array.isArray(manifest.problems)) {
      throw new Error('Manifest has no problems list');
    }
    entryList = manifest.problems;
  } catch (error) {
    console.error('Could not read the problem manifest', { baseUrl, error });
    result.error = error.message;

    return result;
  }

  fs.mkdirSync(downloadedDirectory, { recursive: true });
  for (const entry of entryList) {
    try {
      validateEntry(entry);
      const installedVersion = getInstalledVersion(entry.id);
      if (installedVersion !== entry.version) {
        await downloadProblem(baseUrl, entry, downloadedDirectory);
        (installedVersion === null ? result.added : result.updated).push(entry.id);
      }
    } catch (error) {
      console.error('Could not sync problem', { error, id: entry && entry.id });
      result.failed.push({ id: entry && entry.id, message: error.message });
    }
  }

  return result;
}

module.exports = { MANIFEST_NAME, VERSION_FILE_NAME, buildProblemEntry, syncProblems };
