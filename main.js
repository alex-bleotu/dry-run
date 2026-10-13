const { BrowserWindow, app, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const { setupAutoUpdate } = require('./app-update');
const { loadTests, readMeta, runCustom, runTests } = require('./runner');
const { MANIFEST_NAME, VERSION_FILE_NAME, syncProblems } = require('./updater');

const BUNDLED_DIRECTORY = path.join(__dirname, 'problems');
const DOWNLOADED_DIRECTORY = path.join(app.getPath('userData'), 'problems');
const APP_VERSION_PATH = path.join(DOWNLOADED_DIRECTORY, '.app-version');
const SOLUTIONS_DIRECTORY = path.join(app.getPath('userData'), 'solutions');
const DEFAULT_PROBLEMS_URL = 'https://raw.githubusercontent.com/alex-bleotu/dry-run/main/problems';
const PROBLEMS_URL_PATTERN = /^(https:\/\/|http:\/\/127\.0\.0\.1[:/])/;
const PROBLEM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

let syncPromise = null;

function resetDownloadedProblemsOnNewVersion() {
  const previousVersion = fs.existsSync(APP_VERSION_PATH) ? fs.readFileSync(APP_VERSION_PATH, 'utf8') : null;
  if (previousVersion !== app.getVersion()) {
    fs.rmSync(DOWNLOADED_DIRECTORY, { force: true, recursive: true });
    fs.mkdirSync(DOWNLOADED_DIRECTORY, { recursive: true });
    fs.writeFileSync(APP_VERSION_PATH, app.getVersion());
  }
}

function listDirectoryProblemId(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        PROBLEM_ID_PATTERN.test(entry.name) &&
        fs.existsSync(path.join(directory, entry.name, 'meta.json')),
    )
    .map((entry) => entry.name);
}

function listProblemId() {
  return [...new Set([...listDirectoryProblemId(BUNDLED_DIRECTORY), ...listDirectoryProblemId(DOWNLOADED_DIRECTORY)])];
}

function getProblemDirectory(id) {
  if (listDirectoryProblemId(DOWNLOADED_DIRECTORY).includes(id)) {
    return path.join(DOWNLOADED_DIRECTORY, id);
  }
  if (listDirectoryProblemId(BUNDLED_DIRECTORY).includes(id)) {
    return path.join(BUNDLED_DIRECTORY, id);
  }

  throw new Error(`Unknown problem ${id}`);
}

function readBundledVersion(id) {
  const manifestPath = path.join(BUNDLED_DIRECTORY, MANIFEST_NAME);
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  const entry = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).problems.find((problem) => problem.id === id);

  return entry ? entry.version : null;
}

function getInstalledVersion(id) {
  const versionPath = path.join(DOWNLOADED_DIRECTORY, id, VERSION_FILE_NAME);
  if (fs.existsSync(versionPath)) {
    return JSON.parse(fs.readFileSync(versionPath, 'utf8')).version;
  }

  return readBundledVersion(id);
}

function getProblemsUrl() {
  const override = process.env.DRY_RUN_PROBLEMS_URL;

  return override && PROBLEMS_URL_PATTERN.test(override) ? override.replace(/\/$/, '') : DEFAULT_PROBLEMS_URL;
}

function getSolutionPath(id) {
  return path.join(SOLUTIONS_DIRECTORY, `${id}.cpp`);
}

function readSolution(id) {
  const solutionPath = getSolutionPath(id);
  if (!fs.existsSync(solutionPath)) {
    const directory = getProblemDirectory(id);
    const legacyPath = path.join(directory, 'solution.cpp');
    fs.mkdirSync(SOLUTIONS_DIRECTORY, { recursive: true });
    fs.copyFileSync(fs.existsSync(legacyPath) ? legacyPath : path.join(directory, 'starter.cpp'), solutionPath);
  }

  return fs.readFileSync(solutionPath, 'utf8');
}

function writeSolution(id, code) {
  getProblemDirectory(id);
  fs.mkdirSync(SOLUTIONS_DIRECTORY, { recursive: true });
  fs.writeFileSync(getSolutionPath(id), code);
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    backgroundColor: '#0a0b10',
    height: 900,
    icon: path.join(__dirname, 'icon.png'),
    title: 'Dry Run',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    width: 1500,
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('app:sync-problems', () => {
  if (!syncPromise) {
    syncPromise = syncProblems({
      baseUrl: getProblemsUrl(),
      downloadedDirectory: DOWNLOADED_DIRECTORY,
      getInstalledVersion,
    }).finally(() => {
      syncPromise = null;
    });
  }

  return syncPromise;
});

ipcMain.handle('app:list', () =>
  listProblemId()
    .map((id) => {
      const directory = getProblemDirectory(id);
      const meta = readMeta(directory);

      return {
        difficulty: meta.difficulty,
        id,
        order: meta.order,
        summary: meta.summary,
        testCount: loadTests(path.join(directory, 'tests')).length,
        title: meta.title,
      };
    })
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title)),
);

ipcMain.handle('app:open', (event, id) => {
  const directory = getProblemDirectory(id);
  const meta = readMeta(directory);
  const visibleTestList = loadTests(path.join(directory, 'tests')).filter(
    (test) => test.source === 'visible.json',
  );

  return {
    code: readSolution(id),
    defaultInput: visibleTestList.length > 0 ? visibleTestList[visibleTestList.length - 1].input : {},
    difficulty: meta.difficulty,
    inputKeys: meta.inputKeys,
    problem: fs.readFileSync(path.join(directory, 'problem.md'), 'utf8'),
    title: meta.title,
  };
});

ipcMain.handle('app:reset', (event, id) => {
  const starter = fs.readFileSync(path.join(getProblemDirectory(id), 'starter.cpp'), 'utf8');
  writeSolution(id, starter);

  return starter;
});

ipcMain.handle('app:save', (event, { code, id }) => {
  writeSolution(id, code);
});

ipcMain.handle('app:run', async (event, { code, id }) => {
  const problemDirectory = getProblemDirectory(id);
  writeSolution(id, code);

  return runTests({ code, problemDirectory });
});

ipcMain.handle('app:run-custom', async (event, { code, id, input }) => {
  const problemDirectory = getProblemDirectory(id);
  writeSolution(id, code);

  return runCustom({ code, input, problemDirectory });
});

if (app.requestSingleInstanceLock()) {
  app.on('second-instance', () => {
    const [existingWindow] = BrowserWindow.getAllWindows();
    if (existingWindow) {
      if (existingWindow.isMinimized()) {
        existingWindow.restore();
      }
      existingWindow.focus();
    }
  });
  app.whenReady().then(() => {
    resetDownloadedProblemsOnNewVersion();
    createWindow();
    setupAutoUpdate();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
} else {
  app.quit();
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
