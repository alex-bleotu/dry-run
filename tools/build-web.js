// Builds the website version of Dry Run into web-dist/, ready for Netlify or any static host.
// The page is the desktop renderer with web/practice.js standing in for preload.js, and C++ is compiled in the
// browser by Clang built for WebAssembly.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const zlib = require('node:zlib');

const { loadTests, readMeta } = require('../runner');

const ROOT = path.join(__dirname, '..');
const OUTPUT_DIRECTORY = path.join(ROOT, 'web-dist');
const NODE_MODULES_DIRECTORY = path.join(ROOT, 'node_modules');
const CLANG_DIRECTORY = path.join(NODE_MODULES_DIRECTORY, '@yowasp', 'clang', 'gen');
const CACHE_DIRECTORY = path.join(NODE_MODULES_DIRECTORY, '.cache', 'dry-run-web');
const PROBLEMS_DIRECTORY = path.join(ROOT, 'problems');
const PART_SIZE = 8 * 1024 * 1024;
const PCH_NAME = 'stdc++.pch';
// The desktop app's g++ flags, plus -fno-exceptions because the WebAssembly C++ library has no exception support.
const LANGUAGE_FLAG_LIST = ['-std=c++17', '-Wall', '-Wextra', '-Werror', '-O2', '-fno-exceptions'];
const COMPILE_FLAG_LIST = [...LANGUAGE_FLAG_LIST, '-isystem', 'include'];
// An 8 MB stack like a desktop program gets, instead of WebAssembly's default 64 KB.
const LINK_FLAG_LIST = ['-Wl,-z,stack-size=8388608'];
// Every C++17 standard header that builds for WASI. <csetjmp> and <csignal> do not, so they are left out.
const HEADER_LIST = [
  'algorithm', 'any', 'array', 'atomic', 'bitset', 'cassert', 'cctype', 'cerrno', 'cfenv', 'cfloat', 'charconv',
  'chrono', 'cinttypes', 'climits', 'clocale', 'cmath', 'codecvt', 'complex', 'condition_variable', 'cstdarg',
  'cstddef', 'cstdint', 'cstdio', 'cstdlib', 'cstring', 'ctime', 'cuchar', 'cwchar', 'cwctype', 'deque',
  'exception', 'execution', 'filesystem', 'forward_list', 'fstream', 'functional', 'future', 'initializer_list',
  'iomanip', 'ios', 'iosfwd', 'iostream', 'istream', 'iterator', 'limits', 'list', 'locale', 'map', 'memory',
  'memory_resource', 'mutex', 'new', 'numeric', 'optional', 'ostream', 'queue', 'random', 'ratio', 'regex',
  'scoped_allocator', 'set', 'shared_mutex', 'sstream', 'stack', 'stdexcept', 'streambuf', 'string',
  'string_view', 'system_error', 'thread', 'tuple', 'type_traits', 'typeindex', 'typeinfo', 'unordered_map',
  'unordered_set', 'utility', 'valarray', 'variant', 'vector',
];
const HEADER = `#pragma once\n${HEADER_LIST.map((name) => `#include <${name}>`).join('\n')}\n`;
const SITE_FILE_LIST = [
  'icon.png',
  'judge.js',
  'renderer/renderer.js',
  'web/compiler-worker.js',
  'web/practice.js',
  'web/program-worker.js',
];
const VENDOR_FILE_LIST = [
  '@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2',
  '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-ext-wght-normal.woff2',
  '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
  'marked/lib/marked.umd.js',
];
const PACKED_FILE_TYPE = {
  '.pch': 'application/octet-stream',
  '.tar': 'application/x-tar',
  '.wasm': 'application/wasm',
};

function writeOutput(relativePath, content) {
  const target = path.join(OUTPUT_DIRECTORY, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function copyOutput(source, relativePath) {
  const target = path.join(OUTPUT_DIRECTORY, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { filter: (file) => !file.endsWith('.map'), recursive: true });
}

function replaceAll(text, search, replacement, name) {
  if (!text.includes(search)) {
    throw new Error(`${name}: expected to find ${JSON.stringify(search)}`);
  }

  return text.split(search).join(replacement);
}

// Files the page loads by name get ?v=<hash of this build>, so a browser never pairs a new page with a stylesheet
// or script it cached from an earlier deploy. practice.js passes the same version on to the workers it starts.
function computeBuildVersion() {
  const hash = crypto.createHash('sha256');
  [...SITE_FILE_LIST, 'renderer/styles.css', 'compiler/bundle.js'].forEach((file) => {
    hash.update(fs.readFileSync(path.join(OUTPUT_DIRECTORY, file)));
  });

  return hash.digest('hex').slice(0, 12);
}

function buildPage() {
  const css = fs.readFileSync(path.join(ROOT, 'renderer', 'styles.css'), 'utf8');
  writeOutput('renderer/styles.css', replaceAll(css, '../node_modules/', '../vendor/', 'styles.css'));

  const version = `?v=${computeBuildVersion()}`;
  let html = fs.readFileSync(path.join(ROOT, 'renderer', 'index.html'), 'utf8');
  html = replaceAll(html, 'href="styles.css"', `href="renderer/styles.css${version}"`, 'index.html');
  html = replaceAll(html, 'src="../node_modules/', 'src="vendor/', 'index.html');
  html = replaceAll(
    html,
    '<script src="renderer.js"></script>',
    [
      `<script src="judge.js${version}"></script>`,
      `<script src="web/practice.js${version}"></script>`,
      `<script src="renderer/renderer.js${version}"></script>`,
    ].join('\n    '),
    'index.html',
  );
  html = replaceAll(
    html,
    '<link rel="stylesheet"',
    '<meta name="description" content="Timed C++ interview practice with hidden tests, in your browser." />\n'
      + '    <link rel="icon" href="icon.png" />\n    <link rel="stylesheet"',
    'index.html',
  );
  writeOutput('index.html', html);
}

function buildProblems() {
  const problemList = fs
    .readdirSync(PROBLEMS_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(PROBLEMS_DIRECTORY, entry.name, 'meta.json')))
    .map(({ name: id }) => {
      const directory = path.join(PROBLEMS_DIRECTORY, id);
      const meta = readMeta(directory);
      const testList = loadTests(path.join(directory, 'tests'));
      copyOutput(path.join(directory, 'problem.md'), `problems/${id}/problem.md`);
      copyOutput(path.join(directory, 'starter.cpp'), `problems/${id}/starter.cpp`);
      writeOutput(`problems/${id}/tests.json`, JSON.stringify(testList));

      return {
        difficulty: meta.difficulty,
        id,
        inputKeys: meta.inputKeys,
        order: meta.order,
        summary: meta.summary,
        testCount: testList.length,
        title: meta.title,
      };
    })
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title));
  writeOutput('problems/index.json', JSON.stringify(problemList, null, 2));

  return problemList;
}

// Large files are gzipped and split into parts below 10 MB, which static hosts serve well. The compiler worker
// joins and unzips them in the browser.
function packFile(name, content) {
  const compressed = zlib.gzipSync(content, { level: 9 });
  const partList = [];
  for (let offset = 0; offset < compressed.length; offset += PART_SIZE) {
    const part = `${name}.gz.${String(partList.length).padStart(3, '0')}`;
    writeOutput(`compiler/${part}`, compressed.subarray(offset, offset + PART_SIZE));
    partList.push(part);
  }

  return { compressedSize: compressed.length, partList, type: PACKED_FILE_TYPE[path.extname(name)] };
}

async function buildPrecompiledHeader(runClang, version) {
  const key = crypto
    .createHash('sha256')
    .update(JSON.stringify({ COMPILE_FLAG_LIST, HEADER, version }))
    .digest('hex')
    .slice(0, 16);
  const cachePath = path.join(CACHE_DIRECTORY, `${key}.pch`);
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath);
  }

  console.log('Precompiling <bits/stdc++.h> (takes about half a minute)...');
  await runClang(['clang++', '--version'], {}, { fetchProgress: () => {}, stderr: null, stdout: null });
  const output = await runClang(
    ['clang++', ...COMPILE_FLAG_LIST, '-x', 'c++-header', 'include/bits/stdc++.h', '-o', PCH_NAME],
    { include: { bits: { 'stdc++.h': HEADER } } },
    { decodeASCII: false, fetchProgress: () => {} },
  );
  fs.mkdirSync(CACHE_DIRECTORY, { recursive: true });
  fs.writeFileSync(cachePath, output[PCH_NAME]);

  return output[PCH_NAME];
}

async function buildCompiler() {
  const { runClang, version } = await import(pathToFileURL(path.join(CLANG_DIRECTORY, 'bundle.js')).href);
  copyOutput(path.join(CLANG_DIRECTORY, 'bundle.js'), 'compiler/bundle.js');
  const fileMap = {};
  fs.readdirSync(CLANG_DIRECTORY)
    .filter((name) => PACKED_FILE_TYPE[path.extname(name)])
    .forEach((name) => {
      fileMap[name] = packFile(name, fs.readFileSync(path.join(CLANG_DIRECTORY, name)));
    });
  fileMap[PCH_NAME] = packFile(PCH_NAME, await buildPrecompiledHeader(runClang, version));
  const clangVersion = version.replace(/-.*$/, '');
  writeOutput(
    'compiler/manifest.json',
    JSON.stringify(
      {
        compileFlagList: COMPILE_FLAG_LIST,
        description: `Clang ${clangVersion}: ${LANGUAGE_FLAG_LIST.join(' ')}`,
        fileMap,
        header: HEADER,
        label: LANGUAGE_FLAG_LIST[0].slice('-std='.length).toUpperCase(),
        linkFlagList: LINK_FLAG_LIST,
        version,
      },
      null,
      2,
    ),
  );

  return fileMap;
}

function formatSize(byteCount) {
  return `${(byteCount / 1024 / 1024).toFixed(1)} MB`;
}

async function main() {
  fs.rmSync(OUTPUT_DIRECTORY, { force: true, recursive: true });
  SITE_FILE_LIST.forEach((file) => copyOutput(path.join(ROOT, file), file));
  VENDOR_FILE_LIST.forEach((file) => copyOutput(path.join(NODE_MODULES_DIRECTORY, file), `vendor/${file}`));
  copyOutput(path.join(NODE_MODULES_DIRECTORY, 'monaco-editor', 'min'), 'vendor/monaco-editor/min');
  const problemList = buildProblems();
  const fileMap = await buildCompiler();
  buildPage();

  const compilerSize = Object.values(fileMap).reduce((total, entry) => total + entry.compressedSize, 0);
  console.log(`Built ${path.relative(ROOT, OUTPUT_DIRECTORY)}/ with ${problemList.length} problems.`);
  const partCount = Object.values(fileMap).reduce((total, entry) => total + entry.partList.length, 0);
  console.log(`Compiler download: ${formatSize(compilerSize)} in ${partCount} parts.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
