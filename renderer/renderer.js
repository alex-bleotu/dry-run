const STATUS_BADGE = {
  error: { className: 'badge-warn', text: 'ERROR' },
  fail: { className: 'badge-fail', text: 'FAIL' },
  pass: { className: 'badge-pass', text: 'PASS' },
  timeout: { className: 'badge-warn', text: 'TIMEOUT' },
};
const SAVE_DELAY_MS = 500;
const CUSTOM_STORAGE_PREFIX = 'practice.custom-input.';
const TIMER_INTERVAL_MS = 1000;
const ELAPSED_STORAGE_PREFIX = 'practice.elapsed.';
const RESET_CONFIRMATION = 'Reset this problem? Your code and timer will be cleared.';

const menuElement = document.getElementById('menu');
const problemListElement = document.getElementById('problem-list');
const screenElement = document.getElementById('screen');
const timerElement = document.getElementById('timer');
const backButton = document.getElementById('back');
const resetButton = document.getElementById('reset');
const menuStatusElement = document.getElementById('menu-status');
const menuRefreshButton = document.getElementById('menu-refresh');
const screenTitleElement = document.getElementById('screen-title');
const layout = document.getElementById('layout');
const problemElement = document.getElementById('problem');
const splitter = document.getElementById('splitter');
const bottomElement = document.getElementById('bottom');
const viewTestsButton = document.getElementById('view-tests');
const viewCustomButton = document.getElementById('view-custom');
const resultsElement = document.getElementById('results');
const customElement = document.getElementById('custom');
const customInputsElement = document.getElementById('custom-inputs');
const customOutputElement = document.getElementById('custom-output');
const caseListElement = document.getElementById('case-list');
const caseDetailElement = document.getElementById('case-detail');
const statusElement = document.getElementById('status');
const runButton = document.getElementById('run');

let editor = null;
let currentProblem = null;
let inputKeyList = [];
let timerHandle = null;
let timerStart = 0;
let timerElapsedBase = 0;
let activeView = 'tests';
let hasResults = false;
let resultList = [];
const customTextareaMap = {};
let selectedIndex = 0;
let saveTimer = null;

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function groupProblemParts() {
  const childList = [...problemElement.children];
  let section = null;
  childList.forEach((child) => {
    const match = child.tagName === 'H2' ? /^Part (\d)/.exec(child.textContent) : null;
    if (match) {
      section = createElement('details');
      section.open = true;
      section.dataset.part = match[1];
      const summary = createElement('summary');
      problemElement.insertBefore(section, child);
      summary.appendChild(child);
      section.appendChild(summary);

      return;
    }
    if (child.tagName === 'H2') {
      section = null;
    }
    if (section) {
      section.appendChild(child);
    }
  });
}

function renderLines(text, differingLineSet, className) {
  const pre = createElement('pre', 'output');
  const lineList = text === '' ? [''] : text.split('\n');
  lineList.forEach((line, index) => {
    const isDiffering = differingLineSet.has(index);
    pre.appendChild(createElement('span', isDiffering ? `line ${className}` : 'line', line));
  });

  return pre;
}

function findDifferingLines(expected, actual) {
  const expectedLineList = expected.split('\n');
  const actualLineList = actual === '' ? [] : actual.split('\n');
  const length = Math.max(expectedLineList.length, actualLineList.length);
  const expectedSet = new Set();
  const actualSet = new Set();
  for (let index = 0; index < length; index += 1) {
    if (expectedLineList[index] !== actualLineList[index]) {
      expectedSet.add(index);
      actualSet.add(index);
    }
  }

  return { actualSet, expectedSet };
}

function renderInput(container, input) {
  inputKeyList.forEach((key) => {
    const lineList = input[key] || [];
    if (lineList.length === 0) {
      return;
    }
    container.appendChild(createElement('div', 'detail-heading', key));
    container.appendChild(renderLines(lineList.join('\n'), new Set(), ''));
  });
}

function renderDetail() {
  caseDetailElement.replaceChildren();
  const result = resultList[selectedIndex];
  if (!result) {
    return;
  }

  const badge = STATUS_BADGE[result.status];
  const title = createElement('h3', 'detail-title');
  title.append(`${result.name} `, createElement('span', `badge ${badge.className}`, badge.text));
  caseDetailElement.appendChild(title);

  if (result.isHidden) {
    caseDetailElement.appendChild(
      createElement('p', 'detail-note', 'This test is hidden. Its input and expected output are not shown.'),
    );

    return;
  }

  if (result.status === 'timeout') {
    caseDetailElement.appendChild(createElement('p', 'detail-note', 'Program exceeded 2 seconds.'));
  }
  if (result.stderr) {
    caseDetailElement.appendChild(createElement('div', 'detail-heading', 'stderr'));
    caseDetailElement.appendChild(renderLines(result.stderr.trimEnd(), new Set(), ''));
  }

  renderInput(caseDetailElement, result.input);

  const { actualSet, expectedSet } = findDifferingLines(result.expected, result.actual);
  const compare = createElement('div', 'compare');
  const expectedColumn = createElement('div');
  expectedColumn.appendChild(createElement('div', 'detail-heading', 'Expected'));
  expectedColumn.appendChild(renderLines(result.expected, expectedSet, 'line-differs-expected'));
  const actualColumn = createElement('div');
  actualColumn.appendChild(createElement('div', 'detail-heading', 'Actual'));
  actualColumn.appendChild(renderLines(result.actual, actualSet, 'line-differs-actual'));
  compare.append(expectedColumn, actualColumn);
  caseDetailElement.appendChild(compare);
}

function renderCaseList() {
  caseListElement.replaceChildren();
  resultList.forEach((result, index) => {
    const badge = STATUS_BADGE[result.status];
    const item = createElement('li');
    const button = createElement('button', 'case-button');
    button.type = 'button';
    button.setAttribute('aria-current', String(index === selectedIndex));
    button.append(
      createElement('span', `badge ${badge.className}`, badge.text),
      createElement('span', 'case-name', result.name),
      createElement('span', 'case-tag', result.isHidden ? 'hidden' : ''),
    );
    button.addEventListener('click', () => {
      selectedIndex = index;
      renderCaseList();
      renderDetail();
    });
    item.appendChild(button);
    caseListElement.appendChild(item);
  });
}

function renderCompileError(output) {
  resultList = [];
  caseListElement.replaceChildren();
  caseDetailElement.replaceChildren();
  caseDetailElement.appendChild(createElement('h3', 'detail-title', 'Compile error'));
  caseDetailElement.appendChild(renderLines(output.trimEnd(), new Set(), ''));
  hasResults = true;
  applyView();
}

function showResults(runOutput) {
  if (runOutput.compileError !== null) {
    renderCompileError(runOutput.compileError);
    statusElement.className = 'status status-fail';
    statusElement.textContent = 'Compile error';

    return;
  }

  resultList = runOutput.resultList;
  const failedIndex = resultList.findIndex((result) => result.status !== 'pass');
  selectedIndex = failedIndex === -1 ? 0 : failedIndex;
  hasResults = true;
  applyView();
  renderCaseList();
  renderDetail();

  showResultSummary();
}

function applyView() {
  const isTests = activeView === 'tests';
  viewTestsButton.setAttribute('aria-selected', String(isTests));
  viewCustomButton.setAttribute('aria-selected', String(!isTests));
  resultsElement.hidden = !(isTests && hasResults);
  customElement.hidden = isTests;
  bottomElement.classList.toggle('is-open', !isTests || hasResults);
  runButton.textContent = isTests ? 'Run tests (Ctrl+Enter)' : 'Run custom (Ctrl+Enter)';
  statusElement.textContent = '';
}

function selectView(view) {
  activeView = view;
  applyView();
  if (view === 'tests' && resultList.length > 0) {
    showResultSummary();
  }
}

function showResultSummary() {
  const passedCount = resultList.filter((result) => result.status === 'pass').length;
  const isAllPassed = passedCount === resultList.length;
  statusElement.className = `status ${isAllPassed ? 'status-pass' : 'status-fail'}`;
  statusElement.textContent = `${passedCount}/${resultList.length} passed`;
}

function readCustomInput() {
  return Object.keys(customTextareaMap).reduce((input, key) => {
    input[key] = customTextareaMap[key].value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');

    return input;
  }, {});
}

function loadCustomInput(defaultInput) {
  try {
    const stored = globalThis.localStorage.getItem(`${CUSTOM_STORAGE_PREFIX}${currentProblem.id}`);

    return stored ? JSON.parse(stored) : defaultInput;
  } catch (error) {
    console.error('Could not read stored custom input', { error, problem: currentProblem.id });

    return defaultInput;
  }
}

function saveCustomInput() {
  try {
    globalThis.localStorage.setItem(
      `${CUSTOM_STORAGE_PREFIX}${currentProblem.id}`,
      JSON.stringify(readCustomInput()),
    );
  } catch (error) {
    console.error('Could not store custom input', { error, problem: currentProblem.id });
  }
}

function setupCustomInputs(defaultInput) {
  customInputsElement.replaceChildren();
  Object.keys(customTextareaMap).forEach((key) => {
    delete customTextareaMap[key];
  });
  const input = loadCustomInput(defaultInput);
  inputKeyList.forEach((key) => {
    const label = createElement('label', 'detail-heading custom-label', key);
    const textarea = createElement('textarea', 'custom-input');
    textarea.rows = Math.max(2, (input[key] || []).length);
    textarea.spellcheck = false;
    textarea.value = (input[key] || []).join('\n');
    textarea.addEventListener('input', saveCustomInput);
    label.appendChild(textarea);
    customInputsElement.appendChild(label);
    customTextareaMap[key] = textarea;
  });
}

function showCustomOutput(output) {
  customOutputElement.replaceChildren();
  if (output.compileError !== null) {
    customOutputElement.appendChild(createElement('h3', 'detail-title', 'Compile error'));
    customOutputElement.appendChild(renderLines(output.compileError.trimEnd(), new Set(), ''));
    statusElement.className = 'status status-fail';
    statusElement.textContent = 'Compile error';

    return;
  }

  customOutputElement.appendChild(createElement('h3', 'detail-title', 'Output'));
  customOutputElement.appendChild(renderLines(output.stdout.trimEnd(), new Set(), ''));
  if (output.isTimedOut) {
    customOutputElement.appendChild(createElement('p', 'detail-note', 'Program exceeded 2 seconds.'));
  } else if (output.exitCode !== 0) {
    customOutputElement.appendChild(createElement('p', 'detail-note', `Exit code: ${output.exitCode}`));
  }
  if (output.stderr) {
    customOutputElement.appendChild(createElement('div', 'detail-heading', 'stderr'));
    customOutputElement.appendChild(renderLines(output.stderr.trimEnd(), new Set(), ''));
  }
  const isOk = !output.isTimedOut && output.exitCode === 0;
  statusElement.className = `status ${isOk ? 'status-pass' : 'status-fail'}`;
  statusElement.textContent = isOk ? 'Custom run finished' : 'Custom run failed';
}

async function handleRun() {
  if (runButton.disabled || !currentProblem) {
    return;
  }

  runButton.disabled = true;
  statusElement.className = 'status';
  statusElement.textContent = 'Compiling and running...';
  try {
    if (activeView === 'custom') {
      showCustomOutput(
        await globalThis.practice.runCustom({
          code: editor.getValue(),
          id: currentProblem.id,
          input: readCustomInput(),
        }),
      );
    } else {
      showResults(await globalThis.practice.run({ code: editor.getValue(), id: currentProblem.id }));
    }
  } catch (error) {
    console.error('Run failed', { error });
    statusElement.className = 'status status-fail';
    statusElement.textContent = `Run failed: ${error.message}`;
  } finally {
    runButton.disabled = false;
  }
}

function saveCode() {
  if (!currentProblem) {
    return Promise.resolve();
  }

  return globalThis.practice.save({ code: editor.getValue(), id: currentProblem.id });
}

function handleEditorChange() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveCode().catch((error) => {
      console.error('Save failed', { error });
      statusElement.className = 'status status-fail';
      statusElement.textContent = `Save failed: ${error.message}`;
    });
  }, SAVE_DELAY_MS);
}

function setupSplitter() {
  splitter.addEventListener('pointerdown', (event) => {
    splitter.setPointerCapture(event.pointerId);
    const handleMove = (moveEvent) => {
      const width = Math.min(Math.max(moveEvent.clientX, 240), globalThis.innerWidth - 400);
      layout.style.setProperty('--problem-width', `${width}px`);
    };
    const handleUp = () => {
      splitter.removeEventListener('pointermove', handleMove);
      splitter.removeEventListener('pointerup', handleUp);
    };
    splitter.addEventListener('pointermove', handleMove);
    splitter.addEventListener('pointerup', handleUp);
  });
}

function findFoldingRangeList(model) {
  const rangeList = [];
  const stack = [];
  let headerStart = 0;
  let headerEnd = 0;
  let isHeader = true;
  model.getLinesContent().forEach((line, index) => {
    const lineNumber = index + 1;
    if (isHeader) {
      if (/^\s*(#include|using\s)/.test(line)) {
        headerStart = headerStart || lineNumber;
        headerEnd = lineNumber;
      } else if (line.trim() !== '') {
        isHeader = false;
      }
    }

    const cleaned = line.replace(/"(\\.|[^"\\])*"/g, '""').replace(/\/\/.*$/, '');
    const isClosingFirst = /^\s*}/.test(cleaned);
    for (const character of cleaned) {
      if (character === '{') {
        stack.push(lineNumber);
      } else if (character === '}' && stack.length > 0) {
        const startLine = stack.pop();
        const endLine = isClosingFirst ? lineNumber - 1 : lineNumber;
        if (endLine > startLine) {
          rangeList.push({ end: endLine, start: startLine });
        }
      }
    }
  });
  if (headerEnd > headerStart) {
    rangeList.push({ end: headerEnd, start: headerStart });
  }

  return rangeList;
}

function findInitialFoldLineList(model) {
  const lineList = model.getLinesContent();
  const headerIndex = lineList.findIndex((line) => /^\s*(#include|using\s)/.test(line));
  const mainIndex = lineList.findIndex((line) => /^int\s+main\s*\(/.test(line));

  return [headerIndex, mainIndex].filter((index) => index !== -1);
}

async function foldInitialRegionList(createdEditor) {
  const folding = createdEditor.getContribution('editor.contrib.folding');
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const foldingModel = await folding.getFoldingModel();
    if (foldingModel && foldingModel.textModel === createdEditor.getModel() && foldingModel.regions.length > 0) {
      createdEditor.trigger('initial-fold', 'editor.fold', {
        selectionLines: findInitialFoldLineList(createdEditor.getModel()),
      });

      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

let monacoPromise = null;

function loadMonaco() {
  if (!monacoPromise) {
    monacoPromise = new Promise((resolve) => {
      const base = new URL('../node_modules/monaco-editor/min', globalThis.location.href).href;
      globalThis.MonacoEnvironment = {
        getWorkerUrl() {
          return `${base}/vs/editor/editor.worker.js`;
        },
      };
      globalThis.require.config({ paths: { vs: `${base}/vs` } });
      globalThis.require(['vs/editor/editor.main'], () => {
        globalThis.monaco.languages.registerFoldingRangeProvider('cpp', {
          provideFoldingRanges: findFoldingRangeList,
        });
        resolve(globalThis.monaco);
      });
    });
  }

  return monacoPromise;
}

function createEditor(monaco, model) {
  const createdEditor = monaco.editor.create(document.getElementById('editor'), {
    automaticLayout: true,
    fontFamily: "'DejaVu Sans Mono', 'Liberation Mono', monospace",
    fontLigatures: false,
    fontSize: 14,
    lineHeight: 22,
    minimap: { enabled: false },
    model,
    scrollBeyondLastLine: false,
    showFoldingControls: 'always',
    theme: 'vs-dark',
  });
  createdEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, handleRun);
  document.fonts.ready.then(() => monaco.editor.remeasureFonts());

  return createdEditor;
}

function formatElapsed(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

function currentElapsedMs() {
  return timerElapsedBase + (timerHandle === null ? 0 : Date.now() - timerStart);
}

function loadElapsedMs(id) {
  try {
    return Number(globalThis.localStorage.getItem(`${ELAPSED_STORAGE_PREFIX}${id}`)) || 0;
  } catch (error) {
    console.error('Could not read stored time', { error, problem: id });

    return 0;
  }
}

function saveElapsed() {
  if (!currentProblem) {
    return;
  }
  try {
    globalThis.localStorage.setItem(
      `${ELAPSED_STORAGE_PREFIX}${currentProblem.id}`,
      String(currentElapsedMs()),
    );
  } catch (error) {
    console.error('Could not store time', { error, problem: currentProblem.id });
  }
}

function renderTimer() {
  timerElement.textContent = formatElapsed(Math.floor(currentElapsedMs() / 1000));
}

function startTimer(elapsedMs) {
  clearInterval(timerHandle);
  timerElapsedBase = elapsedMs;
  timerStart = Date.now();
  renderTimer();
  timerHandle = setInterval(() => {
    renderTimer();
    saveElapsed();
  }, TIMER_INTERVAL_MS);
}

function stopTimer() {
  saveElapsed();
  clearInterval(timerHandle);
  timerHandle = null;
}

function resetResults() {
  resultList = [];
  hasResults = false;
  selectedIndex = 0;
  activeView = 'tests';
  caseListElement.replaceChildren();
  caseDetailElement.replaceChildren();
  customOutputElement.replaceChildren();
  statusElement.className = 'status';
  statusElement.textContent = '';
}

async function openProblem(id) {
  const data = await globalThis.practice.open(id);
  currentProblem = { defaultInput: data.defaultInput, id, title: data.title };
  inputKeyList = data.inputKeys;
  menuElement.hidden = true;
  screenElement.hidden = false;
  screenTitleElement.textContent = data.title;
  problemElement.innerHTML = globalThis.marked.parse(data.problem);
  groupProblemParts();
  problemElement.scrollTop = 0;
  resetResults();
  setupCustomInputs(data.defaultInput);
  applyView();

  const monaco = await loadMonaco();
  const model = monaco.editor.createModel(data.code, 'cpp');
  model.onDidChangeContent(handleEditorChange);
  if (editor) {
    const previousModel = editor.getModel();
    editor.setModel(model);
    previousModel.dispose();
  } else {
    editor = createEditor(monaco, model);
  }
  foldInitialRegionList(editor);
  startTimer(loadElapsedMs(id));
}

async function handleReset() {
  if (!currentProblem || !globalThis.confirm(RESET_CONFIRMATION)) {
    return;
  }

  const { defaultInput, id } = currentProblem;
  clearTimeout(saveTimer);
  try {
    globalThis.localStorage.removeItem(`${CUSTOM_STORAGE_PREFIX}${id}`);
  } catch (error) {
    console.error('Could not clear stored custom input', { error, problem: id });
  }
  try {
    editor.getModel().setValue(await globalThis.practice.reset(id));
  } catch (error) {
    console.error('Reset failed', { error, problem: id });
    statusElement.className = 'status status-fail';
    statusElement.textContent = `Reset failed: ${error.message}`;

    return;
  }
  resetResults();
  setupCustomInputs(defaultInput);
  applyView();
  foldInitialRegionList(editor);
  startTimer(0);
  saveElapsed();
}

async function backToMenu() {
  clearTimeout(saveTimer);
  try {
    await saveCode();
  } catch (error) {
    console.error('Save failed', { error });
  }
  stopTimer();
  currentProblem = null;
  screenElement.hidden = true;
  menuElement.hidden = false;
}

function renderMenu(problemList) {
  problemListElement.replaceChildren();
  problemList.forEach((problem) => {
    const item = createElement('li');
    const card = createElement('button', 'problem-card');
    card.type = 'button';
    const meta = createElement('div', 'problem-card-meta');
    meta.append(
      createElement('span', undefined, problem.difficulty),
      createElement('span', undefined, `${problem.testCount} tests`),
    );
    card.append(
      createElement('h2', 'problem-card-title', problem.title),
      createElement('p', 'problem-card-summary', problem.summary),
      meta,
    );
    card.addEventListener('click', () => {
      openProblem(problem.id).catch((error) => {
        console.error('Open failed', { error, problem: problem.id });
        menuElement.hidden = false;
        screenElement.hidden = true;
      });
    });
    item.appendChild(card);
    problemListElement.appendChild(item);
  });
}

function escapeHtml(text) {
  return createElement('span', undefined, text).innerHTML;
}

function configureMarkdown() {
  globalThis.marked.use({
    renderer: {
      html({ text }) {
        return escapeHtml(text);
      },
      image({ text }) {
        return escapeHtml(text);
      },
      link({ tokens }) {
        return this.parser.parseInline(tokens);
      },
    },
  });
}

function describeSync(result) {
  if (result.error) {
    return 'Could not check for new problems';
  }
  const changeList = [];
  if (result.added.length > 0) {
    changeList.push(`${result.added.length} new`);
  }
  if (result.updated.length > 0) {
    changeList.push(`${result.updated.length} updated`);
  }
  const failedText = result.failed.length > 0 ? `, ${result.failed.length} failed` : '';

  return changeList.length > 0 ? `Problems: ${changeList.join(', ')}${failedText}` : `Problems are up to date${failedText}`;
}

async function syncProblemList() {
  menuRefreshButton.disabled = true;
  menuStatusElement.textContent = 'Checking for new problems...';
  try {
    const result = await globalThis.practice.syncProblems();
    if (result.added.length > 0 || result.updated.length > 0) {
      renderMenu(await globalThis.practice.list());
    }
    menuStatusElement.textContent = describeSync(result);
  } catch (error) {
    console.error('Problem sync failed', { error });
    menuStatusElement.textContent = 'Could not check for new problems';
  } finally {
    menuRefreshButton.disabled = false;
  }
}

async function start() {
  configureMarkdown();
  renderMenu(await globalThis.practice.list());
  menuRefreshButton.addEventListener('click', syncProblemList);
  syncProblemList();
  backButton.addEventListener('click', backToMenu);
  resetButton.addEventListener('click', handleReset);
  globalThis.addEventListener('beforeunload', () => {
    saveElapsed();
    if (currentProblem) {
      saveCode().catch((error) => {
        console.error('Save on exit failed', { error });
      });
    }
  });
  runButton.addEventListener('click', handleRun);
  viewTestsButton.addEventListener('click', () => selectView('tests'));
  viewCustomButton.addEventListener('click', () => selectView('custom'));
  globalThis.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'Enter') {
      handleRun();
    }
  });
  setupSplitter();
}

start().catch((error) => {
  console.error('Startup failed', { error });
});
