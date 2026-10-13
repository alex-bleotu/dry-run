const ICON_PATH = {
  arrow: ['M3 8h10', 'M9 4l4 4-4 4'],
  check: ['M3.5 8.5l3 3 6-7'],
  clock: ['M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z', 'M8 4.5V8l2.5 1.5'],
  cross: ['M4.5 4.5l7 7', 'M11.5 4.5l-7 7'],
  flask: [
    'M6 1.5h4',
    'M6.5 1.5v4L2.8 12.4a1.4 1.4 0 0 0 1.2 2.1h8a1.4 1.4 0 0 0 1.2-2.1L9.5 5.5v-4',
    'M4.4 9.5h7.2',
  ],
  lock: [
    'M4 7.5h8a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z',
    'M5.5 7.5V5a2.5 2.5 0 0 1 5 0v2.5',
  ],
  warning: ['M8 4v5', 'M8 11.5v.5'],
};
const STATUS_BADGE = {
  error: { className: 'badge-warn', icon: 'warning', tone: 'warn', text: 'ERROR' },
  fail: { className: 'badge-fail', icon: 'cross', tone: 'fail', text: 'FAIL' },
  pass: { className: 'badge-pass', icon: 'check', tone: 'pass', text: 'PASS' },
  timeout: { className: 'badge-warn', icon: 'clock', tone: 'warn', text: 'TIMEOUT' },
};
const SAVE_DELAY_MS = 500;
const CUSTOM_STORAGE_PREFIX = 'practice.custom-input.';
const TIMER_INTERVAL_MS = 1000;
const ELAPSED_STORAGE_PREFIX = 'practice.elapsed.';
const EDITOR_THEME_NAME = 'dry-run';
const EDITOR_FONT_FAMILY = "'JetBrains Mono Variable', 'DejaVu Sans Mono', 'Liberation Mono', monospace";
const TYPE_KEYWORD_LIST = [
  'auto',
  'bool',
  'char',
  'double',
  'float',
  'int',
  'long',
  'short',
  'signed',
  'unsigned',
  'void',
];
const EDITOR_THEME = {
  base: 'vs-dark',
  colors: {
    'editor.background': '#11131a',
    'editor.findMatchBackground': '#ffd16640',
    'editor.findMatchHighlightBackground': '#ffd16620',
    'editor.foldBackground': '#635bff14',
    'editor.foreground': '#e7e9f0',
    'editor.inactiveSelectionBackground': '#635bff26',
    'editor.lineHighlightBackground': '#171a23',
    'editor.lineHighlightBorder': '#00000000',
    'editor.selectionBackground': '#635bff47',
    'editor.selectionHighlightBackground': '#635bff1f',
    'editor.wordHighlightBackground': '#ffffff10',
    'editorBracketHighlight.foreground1': '#c4b5fd',
    'editorBracketHighlight.foreground2': '#ffd166',
    'editorBracketHighlight.foreground3': '#7dd3fc',
    'editorBracketMatch.background': '#635bff26',
    'editorBracketMatch.border': '#635bff80',
    'editorCursor.foreground': '#a9a4ff',
    'editorGutter.background': '#11131a',
    'editorHoverWidget.background': '#171a23',
    'editorHoverWidget.border': '#30364a',
    'editorIndentGuide.activeBackground1': '#353b52',
    'editorIndentGuide.background1': '#1f2330',
    'editorLineNumber.activeForeground': '#a9a4ff',
    'editorLineNumber.foreground': '#3a4054',
    'editorOverviewRuler.border': '#00000000',
    'editorSuggestWidget.background': '#171a23',
    'editorSuggestWidget.border': '#30364a',
    'editorSuggestWidget.selectedBackground': '#635bff33',
    'editorWhitespace.foreground': '#2a2f40',
    'editorWidget.background': '#171a23',
    'editorWidget.border': '#30364a',
    focusBorder: '#635bff',
    'input.background': '#0c0e14',
    'input.border': '#30364a',
    'scrollbar.shadow': '#00000000',
    'scrollbarSlider.activeBackground': '#ffffff33',
    'scrollbarSlider.background': '#ffffff14',
    'scrollbarSlider.hoverBackground': '#ffffff24',
    'widget.shadow': '#00000080',
  },
  inherit: true,
  rules: [
    { fontStyle: 'italic', foreground: '5f6679', token: 'comment' },
    { foreground: 'c4a7ff', token: 'keyword' },
    ...TYPE_KEYWORD_LIST.map((keyword) => ({ foreground: '7dd3fc', token: `keyword.${keyword}` })),
    { foreground: 'ffd166', token: 'keyword.directive' },
    { foreground: '9ee6b8', token: 'string' },
    { foreground: 'ffb37a', token: 'number' },
    { foreground: 'e7e9f0', token: 'identifier' },
    { foreground: '8d94a8', token: 'delimiter' },
    { foreground: '8ab4ff', token: 'operator' },
    { foreground: 'ffd166', token: 'annotation' },
  ],
};

const menuElement = document.getElementById('menu');
const problemListElement = document.getElementById('problem-list');
const problemCountElement = document.getElementById('problem-count');
const screenElement = document.getElementById('screen');
const timerElement = document.getElementById('timer');
const backButton = document.getElementById('back');
const resetButton = document.getElementById('reset');
const menuStatusElement = document.getElementById('menu-status');
const menuRefreshButton = document.getElementById('menu-refresh');
const screenTitleElement = document.getElementById('screen-title');
const screenDifficultyElement = document.getElementById('screen-difficulty');
const confirmDialog = document.getElementById('confirm-dialog');
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
const caseSummaryElement = document.getElementById('case-summary');
const caseListElement = document.getElementById('case-list');
const caseDetailElement = document.getElementById('case-detail');
const statusElement = document.getElementById('status');
const runButton = document.getElementById('run');
const runLabelElement = document.getElementById('run-label');
const compilerHintElement = document.getElementById('compiler-hint');

let editor = null;
let problemList = [];
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

function createIcon(name, size = 12) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('height', String(size));
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', String(size));
  ICON_PATH[name].forEach((pathData) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    svg.appendChild(path);
  });

  return svg;
}

function createStatusIcon(status) {
  const badge = STATUS_BADGE[status];
  const icon = createElement('span', `status-icon status-icon-${badge.tone}`);
  icon.appendChild(createIcon(badge.icon, 11));

  return icon;
}

function createBadge(status) {
  const badge = STATUS_BADGE[status];
  const element = createElement('span', `badge ${badge.className}`);
  element.append(createStatusIcon(status), badge.text);

  return element;
}

function groupProblemParts() {
  const childList = [...problemElement.children];
  let section = null;
  childList.forEach((child) => {
    const match = child.tagName === 'H2' ? /^Part (\d+):?\s*/.exec(child.textContent) : null;
    if (match) {
      section = createElement('details');
      section.open = true;
      section.dataset.part = match[1];
      const summary = createElement('summary');
      problemElement.insertBefore(section, child);
      child.textContent = child.textContent.slice(match[0].length) || child.textContent;
      summary.append(createElement('span', 'part-badge', `Part ${match[1]}`), child);
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
  const grid = createElement('div', 'input-grid');
  inputKeyList.forEach((key) => {
    const lineList = input[key] || [];
    if (lineList.length === 0) {
      return;
    }
    const column = createElement('div');
    column.appendChild(createElement('div', 'detail-heading', key));
    column.appendChild(renderLines(lineList.join('\n'), new Set(), ''));
    grid.appendChild(column);
  });
  container.appendChild(grid);
}

function renderDetail() {
  caseDetailElement.replaceChildren();
  const result = resultList[selectedIndex];
  if (!result) {
    return;
  }

  const title = createElement('h3', 'detail-title');
  title.append(createBadge(result.status), result.name);
  if (result.label) {
    title.appendChild(createElement('span', 'detail-label', result.label));
  }
  caseDetailElement.appendChild(title);

  if (result.isHidden) {
    const note = createElement('div', 'hidden-note');
    note.append(
      createIcon('lock', 20),
      createElement('span', undefined, 'This test is hidden. Its input and expected output are not shown.'),
    );
    caseDetailElement.appendChild(note);

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
  actualColumn.appendChild(createElement('div', 'detail-heading', 'Your output'));
  actualColumn.appendChild(renderLines(result.actual, actualSet, 'line-differs-actual'));
  compare.append(expectedColumn, actualColumn);
  caseDetailElement.appendChild(compare);
}

function renderCaseSummary() {
  const passedCount = resultList.filter((result) => result.status === 'pass').length;
  const text = createElement('div', 'case-summary-text');
  text.append(
    createElement('span', 'case-summary-count', `${passedCount}/${resultList.length}`),
    createElement('span', 'case-summary-label', 'tests passed'),
  );
  const bar = createElement('div', 'case-summary-bar');
  resultList.forEach((result) => {
    const { tone } = STATUS_BADGE[result.status];
    bar.appendChild(createElement('span', `case-summary-segment case-summary-segment-${tone}`));
  });
  caseSummaryElement.replaceChildren(text, bar);
}

function renderCaseList() {
  renderCaseSummary();
  caseListElement.replaceChildren();
  resultList.forEach((result, index) => {
    const item = createElement('li');
    const button = createElement('button', 'case-button');
    button.type = 'button';
    button.setAttribute('aria-current', String(index === selectedIndex));
    const tag = createElement('span', 'case-tag');
    if (result.isHidden) {
      tag.append(createIcon('lock', 11), 'hidden');
    }
    button.append(createStatusIcon(result.status), createElement('span', 'case-name', result.name), tag);
    button.addEventListener('click', () => {
      selectedIndex = index;
      renderCaseList();
      renderDetail();
    });
    item.appendChild(button);
    caseListElement.appendChild(item);
  });
}

function renderCompileErrorBox(container, output) {
  const box = createElement('div', 'compile-error');
  const title = createElement('h3', 'detail-title');
  title.append(createStatusIcon('fail'), 'Compile error');
  box.append(title, renderLines(output.trimEnd(), new Set(), ''));
  container.appendChild(box);
}

function renderCompileError(output) {
  resultList = [];
  caseSummaryElement.replaceChildren();
  caseListElement.replaceChildren();
  caseDetailElement.replaceChildren();
  renderCompileErrorBox(caseDetailElement, output);
  resultsElement.classList.add('has-compile-error');
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

  resultsElement.classList.remove('has-compile-error');
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
  runLabelElement.textContent = isTests ? 'Run tests' : 'Run custom';
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
    renderCompileErrorBox(customOutputElement, output.compileError);
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
  statusElement.className = 'status status-running';
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
    splitter.classList.add('is-dragging');
    document.body.classList.add('is-resizing');
    const panelLeft = splitter.previousElementSibling.getBoundingClientRect().left;
    const grabOffset = event.clientX - splitter.getBoundingClientRect().left;
    const handleMove = (moveEvent) => {
      const width = Math.min(
        Math.max(moveEvent.clientX - grabOffset - panelLeft, 240),
        globalThis.innerWidth - 400,
      );
      layout.style.setProperty('--problem-width', `${width}px`);
    };
    const handleUp = () => {
      splitter.classList.remove('is-dragging');
      document.body.classList.remove('is-resizing');
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
      const loaderSource = document.querySelector('script[src$="/vs/loader.js"]').src;
      const base = loaderSource.slice(0, -'/vs/loader.js'.length);
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
        globalThis.monaco.editor.defineTheme(EDITOR_THEME_NAME, EDITOR_THEME);
        resolve(globalThis.monaco);
      });
    });
  }

  return monacoPromise;
}

function createEditor(monaco, model) {
  const createdEditor = monaco.editor.create(document.getElementById('editor'), {
    automaticLayout: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    fontFamily: EDITOR_FONT_FAMILY,
    fontLigatures: false,
    fontSize: 14,
    hideCursorInOverviewRuler: true,
    lineHeight: 22,
    minimap: { enabled: false },
    model,
    overviewRulerBorder: false,
    padding: { top: 12 },
    renderLineHighlight: 'all',
    scrollBeyondLastLine: false,
    scrollbar: { horizontalScrollbarSize: 10, useShadows: false, verticalScrollbarSize: 10 },
    showFoldingControls: 'always',
    smoothScrolling: true,
    theme: EDITOR_THEME_NAME,
  });
  createdEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, handleRun);
  document.fonts.load(`14px ${EDITOR_FONT_FAMILY}`).then(() => monaco.editor.remeasureFonts());

  return createdEditor;
}

function colorizeProblemCode(monaco) {
  problemElement.querySelectorAll('pre > code.language-cpp').forEach((code) => {
    code.textContent = code.textContent.replace(/\n$/, '');
    code.dataset.lang = 'cpp';
    monaco.editor.colorizeElement(code, { theme: EDITOR_THEME_NAME }).catch((error) => {
      console.error('Could not colorize code block', { error });
    });
  });
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
  resultsElement.classList.remove('has-compile-error');
  caseSummaryElement.replaceChildren();
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
  screenDifficultyElement.className = `pill pill-${String(data.difficulty).toLowerCase()}`;
  screenDifficultyElement.textContent = data.difficulty || '';
  problemElement.innerHTML = globalThis.marked.parse(data.problem);
  groupProblemParts();
  problemElement.scrollTop = 0;
  resetResults();
  setupCustomInputs(data.defaultInput);
  applyView();

  const monaco = await loadMonaco();
  colorizeProblemCode(monaco);
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

function confirmReset() {
  return new Promise((resolve) => {
    confirmDialog.returnValue = '';
    confirmDialog.addEventListener('close', () => resolve(confirmDialog.returnValue === 'confirm'), {
      once: true,
    });
    confirmDialog.showModal();
  });
}

async function handleReset() {
  if (!currentProblem || !(await confirmReset())) {
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
  renderMenu();
  screenElement.hidden = true;
  menuElement.hidden = false;
}

function createMetaItem(iconName, text, className = 'meta-item') {
  const item = createElement('span', className);
  item.append(createIcon(iconName, 13), text);

  return item;
}

function renderMenu() {
  problemCountElement.textContent = `Problems · ${problemList.length}`;
  problemListElement.replaceChildren();
  problemList.forEach((problem, index) => {
    const item = createElement('li');
    const card = createElement('button', 'problem-card');
    card.type = 'button';
    const top = createElement('div', 'problem-card-top');
    top.append(
      createElement('span', 'problem-index', String(index + 1).padStart(2, '0')),
      createElement('span', `pill pill-${String(problem.difficulty).toLowerCase()}`, problem.difficulty),
    );
    const elapsedSeconds = Math.floor(loadElapsedMs(problem.id) / 1000);
    const meta = createElement('div', 'problem-card-meta');
    meta.append(
      createMetaItem('flask', `${problem.testCount} tests`),
      elapsedSeconds > 0
        ? createMetaItem('clock', `${formatElapsed(elapsedSeconds)} spent`, 'meta-item meta-item-active')
        : createMetaItem('clock', 'Not started'),
    );
    const arrow = createElement('span', 'problem-card-arrow');
    arrow.appendChild(createIcon('arrow', 16));
    meta.appendChild(arrow);
    card.append(
      top,
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
      problemList = await globalThis.practice.list();
      renderMenu();
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
  problemList = await globalThis.practice.list();
  renderMenu();
  if (globalThis.practice.syncProblems) {
    menuRefreshButton.addEventListener('click', syncProblemList);
    syncProblemList();
  } else {
    menuRefreshButton.hidden = true;
  }
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
  globalThis.practice.onCompilerStatus?.((text) => {
    compilerHintElement.textContent = text;
  });
}

start().catch((error) => {
  console.error('Startup failed', { error });
});
