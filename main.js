const { BrowserWindow, app, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const { loadTests, readMeta, runCustom, runTests } = require('./runner');

const PROBLEMS_DIRECTORY = path.join(__dirname, 'problems');
const SOLUTIONS_DIRECTORY = path.join(app.getPath('userData'), 'solutions');

function listProblemId() {
  return fs
    .readdirSync(PROBLEMS_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(PROBLEMS_DIRECTORY, entry.name, 'meta.json')))
    .map((entry) => entry.name);
}

function getProblemDirectory(id) {
  if (!listProblemId().includes(id)) {
    throw new Error(`Unknown problem ${id}`);
  }

  return path.join(PROBLEMS_DIRECTORY, id);
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
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('app:list', () =>
  listProblemId()
    .map((id) => {
      const directory = path.join(PROBLEMS_DIRECTORY, id);
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
    createWindow();
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
