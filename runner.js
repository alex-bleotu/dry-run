const { execFile, spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { buildStdin, judge, normalize } = require('./judge');

const COMPILE_TIMEOUT_MS = 60000;
const RUN_TIMEOUT_MS = 2000;
const MAX_OUTPUT_LENGTH = 1000000;
const HIDDEN_FILE_NAME = 'hidden.json';
const FILE_ORDER = { 'hidden.json': 2, 'mine.json': 1, 'visible.json': 0 };
const PROGRAM_NAME = process.platform === 'win32' ? 'program.exe' : 'program';
const COMPILE_FLAG_LIST = ['-std=c++17', '-Wall', '-Wextra', '-Werror', '-O2'];

function loadTests(testsDirectory) {
  if (!fs.existsSync(testsDirectory)) {
    return [];
  }

  return fs
    .readdirSync(testsDirectory)
    .filter((fileName) => fileName.endsWith('.json'))
    .sort((left, right) => (FILE_ORDER[left] ?? 1) - (FILE_ORDER[right] ?? 1) || left.localeCompare(right))
    .reduce((testList, fileName) => {
      const isHidden = fileName === HIDDEN_FILE_NAME;
      const content = JSON.parse(fs.readFileSync(path.join(testsDirectory, fileName), 'utf8'));
      content.forEach((test) => {
        testList.push({ ...test, isHidden, source: fileName });
      });

      return testList;
    }, []);
}

function readMeta(problemDirectory) {
  return JSON.parse(fs.readFileSync(path.join(problemDirectory, 'meta.json'), 'utf8'));
}

function compile(workDirectory) {
  return new Promise((resolve) => {
    execFile(
      'g++',
      [...COMPILE_FLAG_LIST, 'solution.cpp', '-o', PROGRAM_NAME],
      { cwd: workDirectory, maxBuffer: MAX_OUTPUT_LENGTH, timeout: COMPILE_TIMEOUT_MS },
      (error, stdout, stderr) => {
        if (error && error.code === 'ENOENT') {
          resolve({
            isSuccess: false,
            output: 'g++ was not found. Install a C++ compiler (g++) and make sure it is on your PATH.',
          });

          return;
        }
        resolve({ isSuccess: !error, output: stderr || stdout || (error ? String(error) : '') });
      },
    );
  });
}

function runProgram(workDirectory, stdinText) {
  return new Promise((resolve) => {
    const child = spawn(path.join(workDirectory, PROGRAM_NAME), [], { cwd: workDirectory });
    let stdout = '';
    let stderr = '';
    let isTimedOut = false;
    const timer = setTimeout(() => {
      isTimedOut = true;
      child.kill('SIGKILL');
    }, RUN_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      if (stdout.length < MAX_OUTPUT_LENGTH) {
        stdout += chunk.toString();
      }
    });
    child.stderr.on('data', (chunk) => {
      if (stderr.length < MAX_OUTPUT_LENGTH) {
        stderr += chunk.toString();
      }
    });
    child.stdin.on('error', (error) => {
      if (error.code !== 'EPIPE') {
        stderr += String(error);
      }
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ exitCode: -1, isTimedOut, stderr: String(error), stdout });
    });
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      resolve({ exitCode: exitCode === null ? signal : exitCode, isTimedOut, stderr, stdout });
    });
    child.stdin.end(stdinText);
  });
}

async function withWorkDirectory(code, callback) {
  const workDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'subscription-practice-'));
  try {
    fs.writeFileSync(path.join(workDirectory, 'solution.cpp'), code);

    const compileResult = await compile(workDirectory);
    if (!compileResult.isSuccess) {
      return { compileError: compileResult.output };
    }

    return { compileError: null, ...(await callback(workDirectory)) };
  } finally {
    fs.rmSync(workDirectory, { force: true, recursive: true });
  }
}

function runTests({ code, problemDirectory, shouldMaskHidden = true }) {
  const { inputKeys } = readMeta(problemDirectory);

  return withWorkDirectory(code, async (workDirectory) => {
    const testList = loadTests(path.join(problemDirectory, 'tests'));
    const resultList = [];
    for (const [index, test] of testList.entries()) {
      const runResult = await runProgram(workDirectory, buildStdin(test.input, inputKeys));
      resultList.push(judge(test, runResult, index + 1, shouldMaskHidden));
    }

    return { resultList };
  }).then((output) => ({ resultList: [], ...output }));
}

function runCustom({ code, input, problemDirectory }) {
  const { inputKeys } = readMeta(problemDirectory);

  return withWorkDirectory(code, async (workDirectory) => {
    const runResult = await runProgram(workDirectory, buildStdin(input, inputKeys));

    return {
      exitCode: runResult.exitCode,
      isTimedOut: runResult.isTimedOut,
      stderr: runResult.stderr,
      stdout: runResult.stdout,
    };
  });
}

module.exports = { loadTests, normalize, readMeta, runCustom, runTests };
