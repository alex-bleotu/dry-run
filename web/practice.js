// Browser version of the API that preload.js exposes in the desktop app. Problems are static files, code is kept in
// localStorage, and solutions are compiled and run by Web Workers instead of g++.
(() => {
  const CODE_STORAGE_PREFIX = 'practice.code.';
  const RUN_TIMEOUT_MS = 2000;
  const { buildStdin, judge } = globalThis.dryRunJudge;

  const problemCache = new Map();
  const pendingCompileMap = new Map();
  const statusListenerList = [];
  let problemListPromise = null;
  let compilerWorker = null;
  let compilerStatus = { text: 'Loading compiler...', title: '' };
  let nextCompileId = 1;

  async function fetchFile(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Could not load ${url} (${response.status})`);
    }

    return response;
  }

  function listProblems() {
    if (!problemListPromise) {
      problemListPromise = fetchFile('problems/index.json')
        .then((response) => response.json())
        .catch((error) => {
          problemListPromise = null;
          throw error;
        });
    }

    return problemListPromise;
  }

  async function loadProblem(id) {
    if (!problemCache.has(id)) {
      const problem = (await listProblems()).find((entry) => entry.id === id);
      if (!problem) {
        throw new Error(`Unknown problem ${id}`);
      }
      const [statement, starter, testList] = await Promise.all([
        fetchFile(`problems/${id}/problem.md`).then((response) => response.text()),
        fetchFile(`problems/${id}/starter.cpp`).then((response) => response.text()),
        fetchFile(`problems/${id}/tests.json`).then((response) => response.json()),
      ]);
      problemCache.set(id, { ...problem, starter, statement, testList });
    }

    return problemCache.get(id);
  }

  function readCode(id) {
    try {
      return globalThis.localStorage.getItem(`${CODE_STORAGE_PREFIX}${id}`);
    } catch (error) {
      console.error('Could not read stored code', { error, problem: id });

      return null;
    }
  }

  function writeCode(id, code) {
    globalThis.localStorage.setItem(`${CODE_STORAGE_PREFIX}${id}`, code);
  }

  function setCompilerStatus(text, title = '') {
    compilerStatus = { text, title };
    statusListenerList.forEach((listener) => listener(compilerStatus));
  }

  function rejectPendingCompiles(message) {
    pendingCompileMap.forEach(({ reject }) => reject(new Error(message)));
    pendingCompileMap.clear();
  }

  function getCompilerWorker() {
    if (!compilerWorker) {
      compilerWorker = new Worker('web/compiler-worker.js', { type: 'module' });
      compilerWorker.addEventListener('message', ({ data }) => {
        if (data.type === 'status') {
          setCompilerStatus(data.text, data.title);

          return;
        }
        const pending = pendingCompileMap.get(data.id);
        pendingCompileMap.delete(data.id);
        if (data.error) {
          pending.reject(new Error(data.error));
        } else {
          pending.resolve(data);
        }
      });
      compilerWorker.addEventListener('error', (event) => {
        console.error('Compiler worker failed', { error: event.message });
        compilerWorker = null;
        setCompilerStatus('Compiler failed to load');
        rejectPendingCompiles('The compiler failed to load. Reload the page to try again.');
      });
      compilerWorker.postMessage({ type: 'load' });
    }

    return compilerWorker;
  }

  function compile(code) {
    return new Promise((resolve, reject) => {
      const id = nextCompileId;
      nextCompileId += 1;
      pendingCompileMap.set(id, { reject, resolve });
      getCompilerWorker().postMessage({ code, id, type: 'compile' });
    });
  }

  // Runs one compiled program many times. A run that hits the time limit takes its worker down with it, so the
  // next run starts a fresh worker.
  class ProgramRunner {
    constructor(wasm) {
      this.wasm = wasm;
      this.worker = null;
      this.readyPromise = null;
    }

    startWorker() {
      this.worker = new Worker('web/program-worker.js');
      this.readyPromise = new Promise((resolve, reject) => {
        this.worker.onmessage = resolve;
        this.worker.onerror = (event) => {
          event.preventDefault();
          reject(new Error(`Could not start the program: ${event.message}`));
        };
      });
      this.worker.postMessage({ type: 'load', wasm: this.wasm });
    }

    stopWorker() {
      if (this.worker) {
        this.worker.terminate();
      }
      this.worker = null;
    }

    async run(stdin) {
      if (!this.worker) {
        this.startWorker();
      }
      await this.readyPromise;
      const { worker } = this;

      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          this.stopWorker();
          resolve({ exitCode: null, isTimedOut: true, stderr: '', stdout: '' });
        }, RUN_TIMEOUT_MS);
        worker.onmessage = ({ data }) => {
          clearTimeout(timer);
          resolve({ exitCode: data.exitCode, isTimedOut: false, stderr: data.stderr, stdout: data.stdout });
        };
        worker.onerror = (event) => {
          event.preventDefault();
          clearTimeout(timer);
          this.stopWorker();
          resolve({ exitCode: 1, isTimedOut: false, stderr: event.message, stdout: '' });
        };
        worker.postMessage({ stdin, type: 'run' });
      });
    }
  }

  async function withProgram(code, callback) {
    const { compileError, wasm } = await compile(code);
    if (compileError !== null) {
      return { compileError };
    }

    const runner = new ProgramRunner(wasm);
    try {
      return { compileError: null, ...(await callback(runner)) };
    } finally {
      runner.stopWorker();
    }
  }

  globalThis.practice = {
    list: () => listProblems(),
    onCompilerStatus(listener) {
      statusListenerList.push(listener);
      listener(compilerStatus);
    },
    async open(id) {
      const problem = await loadProblem(id);
      getCompilerWorker();
      const visibleTestList = problem.testList.filter((test) => test.source === 'visible.json');

      return {
        code: readCode(id) ?? problem.starter,
        defaultInput: visibleTestList.length > 0 ? visibleTestList[visibleTestList.length - 1].input : {},
        difficulty: problem.difficulty,
        inputKeys: problem.inputKeys,
        problem: problem.statement,
        title: problem.title,
      };
    },
    async reset(id) {
      const { starter } = await loadProblem(id);
      writeCode(id, starter);

      return starter;
    },
    async run({ code, id }) {
      const { inputKeys, testList } = await loadProblem(id);
      writeCode(id, code);
      const output = await withProgram(code, async (runner) => {
        const resultList = [];
        for (const [index, test] of testList.entries()) {
          const runResult = await runner.run(buildStdin(test.input, inputKeys));
          resultList.push(judge(test, runResult, index + 1, true));
        }

        return { resultList };
      });

      return { resultList: [], ...output };
    },
    async runCustom({ code, id, input }) {
      const { inputKeys } = await loadProblem(id);
      writeCode(id, code);

      return withProgram(code, (runner) => runner.run(buildStdin(input, inputKeys)));
    },
    async save({ code, id }) {
      writeCode(id, code);
    },
  };
})();
